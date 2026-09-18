import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { SlotGeneratorService } from '../business/slot-generator.service';
import { SlotReconcilerService } from '../business/slot-reconciler.service';
import { BookingHoldExpiryProcessor } from './processors/booking-hold-expiry.processor';
import { SendEmailProcessor } from './processors/send-email.processor';
import { SendSmsProcessor } from './processors/send-sms.processor';
import { SendRemindersProcessor } from './processors/send-reminders.processor';
import { ReviewRequestProcessor } from './processors/review-request.processor';

const MS = {
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
};

@Injectable()
export class WorkerCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerCronService.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly slotGenerator: SlotGeneratorService,
    private readonly slotReconciler: SlotReconcilerService,
    private readonly holdExpiryProcessor: BookingHoldExpiryProcessor,
    private readonly emailProcessor: SendEmailProcessor,
    private readonly smsProcessor: SendSmsProcessor,
    private readonly remindersProcessor: SendRemindersProcessor,
    private readonly reviewRequestProcessor: ReviewRequestProcessor,
  ) {}

  onModuleInit() {
    this.startSlotGeneration();
    this.startSlotReconciliation();
    this.startBookingHoldExpiry();
    this.startReminders();
    this.startReviewRequests();
    this.startNotificationRetry();
    this.logger.log('Worker cron scheduling started');
  }

  onModuleDestroy() {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers.length = 0;
    this.logger.log('Worker cron scheduling stopped');
  }

  private addInterval(callback: () => void, ms: number): void {
    this.timers.push(setInterval(callback, ms));
  }

  private startSlotGeneration() {
    const run = async () => {
      try {
        const businesses = await this.prisma.business.findMany({
          where: { isActive: true, isVerified: true },
          select: { id: true },
        });
        this.logger.log(`Slot generation: processing ${businesses.length} businesses`);
        for (const biz of businesses) {
          await this.slotGenerator.generateSlots(biz.id, 30);
        }
      } catch (err) {
        this.logger.error(`Slot generation cron failed: ${(err as Error).message}`);
      }
    };

    this.addInterval(run, MS.DAY);
    run();
  }

  private startSlotReconciliation() {
    const run = async () => {
      try {
        const businesses = await this.prisma.business.findMany({
          where: { isActive: true, isVerified: true },
          select: { id: true },
        });
        this.logger.log(`Slot reconciliation: processing ${businesses.length} businesses`);
        for (const biz of businesses) {
          await this.slotReconciler.reconcileFutureSlots(biz.id);
        }
      } catch (err) {
        this.logger.error(`Slot reconciliation cron failed: ${(err as Error).message}`);
      }
    };

    this.addInterval(run, MS.HOUR);
    run();
  }

  private startBookingHoldExpiry() {
    const run = async () => {
      try {
        await this.holdExpiryProcessor.process();
      } catch (err) {
        this.logger.error(`Booking hold expiry cron failed: ${(err as Error).message}`);
      }
    };

    this.addInterval(run, 5 * MS.MINUTE);
    run();
  }

  private startReminders() {
    const run = async () => {
      try {
        await this.remindersProcessor.process();
      } catch (err) {
        this.logger.error(`Reminder cron failed: ${(err as Error).message}`);
      }
    };

    this.addInterval(run, MS.HOUR);
    run();
  }

  private startReviewRequests() {
    const run = async () => {
      try {
        await this.reviewRequestProcessor.processPending();
      } catch (err) {
        this.logger.error(`Review request cron failed: ${(err as Error).message}`);
      }
    };

    this.addInterval(run, MS.DAY);
    run();
  }

  private startNotificationRetry() {
    const run = async () => {
      try {
        const failedNotifications = await this.prisma.notification.findMany({
          where: {
            status: 'FAILED',
            channel: { in: ['EMAIL', 'SMS'] },
          },
          take: 50,
        });

        if (failedNotifications.length === 0) return;

        this.logger.log(`Retrying ${failedNotifications.length} failed notifications`);

        for (const notification of failedNotifications) {
          try {
            if (notification.channel === 'EMAIL') {
              await this.emailProcessor.process(notification.id);
            } else if (notification.channel === 'SMS') {
              await this.smsProcessor.process(notification.id);
            }
          } catch (err) {
            this.logger.error(`Notification retry failed for ${notification.id}: ${(err as Error).message}`);
          }
        }
      } catch (err) {
        this.logger.error(`Notification retry cron failed: ${(err as Error).message}`);
      }
    };

    this.addInterval(run, 15 * MS.MINUTE);
    run();
  }
}
