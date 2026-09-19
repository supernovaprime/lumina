import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { SlotGeneratorService } from '../business/slot-generator.service';
import { SlotReconcilerService } from '../business/slot-reconciler.service';
import { GdprService } from '../customer/gdpr.service';
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

const PRISMA_UNAVAILABLE_CODES = [
  'P1000', // Authentication failed
  'P1001', // Can't reach database server
  'P1002', // Database already exists
  'P1003', // Database does not exist
  'P1010', // User authentication failed
  'P2021', // Table does not exist
  'P2024', // Timed out
  'P2037', // Too many connections
];

function isPrismaDbError(err: any): boolean {
  if (!err) return false;
  if (typeof err?.code === 'string' && PRISMA_UNAVAILABLE_CODES.includes(err.code)) return true;
  const msg = String(err?.message ?? err).toLowerCase();
  return (
    msg.includes('table') && msg.includes('does not exist') ||
    msg.includes("can't reach database") ||
    msg.includes('connection') && msg.includes('refused') ||
    msg.includes('connection') && msg.includes('timeout') ||
    msg.includes('connection') && msg.includes('terminated') ||
    msg.includes('connection') && msg.includes('lost') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset')
  );
}

@Injectable()
export class WorkerCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerCronService.name);
  private readonly timers: NodeJS.Timeout[] = [];
  private dbAvailable = true;
  private consecutiveFailures = 0;
  private static readonly MAX_CONSECUTIVE_FAILURES = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly slotGenerator: SlotGeneratorService,
    private readonly slotReconciler: SlotReconcilerService,
    private readonly gdprService: GdprService,
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
    this.startDataRetention();
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

  private isDbError(err: any): boolean {
    return isPrismaDbError(err);
  }

  private markDbUnavailable(err: any): void {
    if (this.dbAvailable) {
      this.logger.warn(
        `Database became unavailable: ${err?.message ?? err}. ` +
        `Cron jobs will skip queries until DB recovers.`,
      );
    }
    this.dbAvailable = false;
    this.consecutiveFailures++;
  }

  private markDbAvailable(): void {
    if (!this.dbAvailable) {
      this.logger.log('Database recovered — resuming normal cron operations');
    }
    this.dbAvailable = true;
    this.consecutiveFailures = 0;
  }

  private startSlotGeneration() {
    const run = async () => {
      if (!this.dbAvailable && this.consecutiveFailures >= WorkerCronService.MAX_CONSECUTIVE_FAILURES) {
        this.logger.debug('Slot generation skipped — DB unavailable');
        return;
      }
      try {
        const businesses = await this.prisma.business.findMany({
          where: { isActive: true, isVerified: true },
          select: { id: true },
        });
        this.markDbAvailable();
        this.logger.log(`Slot generation: processing ${businesses.length} businesses`);
        for (const biz of businesses) {
          await this.slotGenerator.generateSlots(biz.id, 30);
        }
      } catch (err: any) {
        if (this.isDbError(err)) {
          this.markDbUnavailable(err);
        }
        this.logger.error(
          `Slot generation cron failed: ${err?.message ?? err}`,
          err?.stack,
        );
      }
    };

    this.addInterval(run, MS.DAY);
    run();
  }

  private startSlotReconciliation() {
    const run = async () => {
      if (!this.dbAvailable && this.consecutiveFailures >= WorkerCronService.MAX_CONSECUTIVE_FAILURES) {
        this.logger.debug('Slot reconciliation skipped — DB unavailable');
        return;
      }
      try {
        const businesses = await this.prisma.business.findMany({
          where: { isActive: true, isVerified: true },
          select: { id: true },
        });
        this.markDbAvailable();
        this.logger.log(`Slot reconciliation: processing ${businesses.length} businesses`);
        for (const biz of businesses) {
          await this.slotReconciler.reconcileFutureSlots(biz.id);
        }
      } catch (err: any) {
        if (this.isDbError(err)) {
          this.markDbUnavailable(err);
        }
        this.logger.error(
          `Slot reconciliation cron failed: ${err?.message ?? err}`,
          err?.stack,
        );
      }
    };

    this.addInterval(run, MS.HOUR);
    run();
  }

  private startBookingHoldExpiry() {
    const run = async () => {
      if (!this.dbAvailable && this.consecutiveFailures >= WorkerCronService.MAX_CONSECUTIVE_FAILURES) {
        this.logger.debug('Booking hold expiry skipped — DB unavailable');
        return;
      }
      try {
        await this.holdExpiryProcessor.process();
      } catch (err: any) {
        if (this.isDbError(err)) {
          this.markDbUnavailable(err);
        }
        this.logger.error(
          `Booking hold expiry cron failed: ${err?.message ?? err}`,
          err?.stack,
        );
      }
    };

    this.addInterval(run, 5 * MS.MINUTE);
    run();
  }

  private startReminders() {
    const run = async () => {
      if (!this.dbAvailable && this.consecutiveFailures >= WorkerCronService.MAX_CONSECUTIVE_FAILURES) {
        this.logger.debug('Reminder cron skipped — DB unavailable');
        return;
      }
      try {
        await this.remindersProcessor.process();
      } catch (err: any) {
        if (this.isDbError(err)) {
          this.markDbUnavailable(err);
        }
        this.logger.error(
          `Reminder cron failed: ${err?.message ?? err}`,
          err?.stack,
        );
      }
    };

    this.addInterval(run, MS.HOUR);
    run();
  }

  private startReviewRequests() {
    const run = async () => {
      if (!this.dbAvailable && this.consecutiveFailures >= WorkerCronService.MAX_CONSECUTIVE_FAILURES) {
        this.logger.debug('Review request cron skipped — DB unavailable');
        return;
      }
      try {
        await this.reviewRequestProcessor.processPending();
      } catch (err: any) {
        if (this.isDbError(err)) {
          this.markDbUnavailable(err);
        }
        this.logger.error(
          `Review request cron failed: ${err?.message ?? err}`,
          err?.stack,
        );
      }
    };

    this.addInterval(run, MS.DAY);
    run();
  }

  private startNotificationRetry() {
    const run = async () => {
      if (!this.dbAvailable && this.consecutiveFailures >= WorkerCronService.MAX_CONSECUTIVE_FAILURES) {
        this.logger.debug('Notification retry skipped — DB unavailable');
        return;
      }

      if (!this.prisma?.notification) {
        this.logger.warn('Notification model unavailable — skipping retry');
        return;
      }

      try {
        const failedNotifications = await this.prisma.notification.findMany({
          where: {
            status: 'FAILED',
            channel: { in: ['EMAIL', 'SMS'] },
          },
          take: 50,
        });

        if (!failedNotifications?.length) return;

        this.logger.log(`Retrying ${failedNotifications.length} failed notifications`);

        for (const notification of failedNotifications) {
          try {
            if (notification.channel === 'EMAIL') {
              await this.emailProcessor.process(notification.id);
            } else if (notification.channel === 'SMS') {
              await this.smsProcessor.process(notification.id);
            }
          } catch (err: any) {
            this.logger.error(
              `Notification retry failed for ${notification.id}: ${err?.message ?? err}`,
              err?.stack,
            );
          }
        }
      } catch (err: any) {
        if (this.isDbError(err)) {
          this.markDbUnavailable(err);
        }
        this.logger.error(
          `Notification retry cron failed: ${err?.message ?? err}`,
          err?.stack,
        );
      }
    };

    this.addInterval(run, 15 * MS.MINUTE);
    run();
  }

  private startDataRetention() {
    const run = async () => {
      if (!this.dbAvailable && this.consecutiveFailures >= WorkerCronService.MAX_CONSECUTIVE_FAILURES) {
        this.logger.debug('Data retention cron skipped — DB unavailable');
        return;
      }
      try {
        const result = await this.gdprService.cleanupExpiredTokens();
        this.markDbAvailable();
        if (result.deleted > 0) {
          this.logger.log(`Data retention: cleaned up ${result.deleted} expired records`);
        }
      } catch (err: any) {
        if (this.isDbError(err)) {
          this.markDbUnavailable(err);
        }
        this.logger.error(
          `Data retention cron failed: ${err?.message ?? err}`,
          err?.stack,
        );
      }
    };

    this.addInterval(run, MS.DAY);
    run();
  }
}
