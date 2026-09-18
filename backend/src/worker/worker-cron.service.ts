import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { SlotGeneratorService } from '../business/slot-generator.service';
import { SlotReconcilerService } from '../business/slot-reconciler.service';
import { NotificationService } from '../notification/notification.service';
import { BookingHoldExpiryProcessor } from './processors/booking-hold-expiry.processor';

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
    private readonly notifications: NotificationService,
    private readonly holdExpiryProcessor: BookingHoldExpiryProcessor,
  ) {}

  onModuleInit() {
    this.startSlotGeneration();
    this.startSlotReconciliation();
    this.startBookingHoldExpiry();
    this.startReminders();
    this.startReviewRequests();
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
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * MS.HOUR);
        const windowStart = new Date(in24h.getTime() - 15 * MS.MINUTE);
        const windowEnd = new Date(in24h.getTime() + 15 * MS.MINUTE);

        const bookings24h = await this.prisma.booking.findMany({
          where: {
            status: 'CONFIRMED',
            date: { gte: windowStart, lte: windowEnd },
          },
          include: { customer: true, business: true },
        });

        for (const booking of bookings24h) {
          try {
            if (booking.customerId) {
              await this.notifications.enqueue('reminder-24h', booking.customerId, {
                bookingId: booking.id,
                businessName: booking.business?.name ?? '',
                date: booking.date,
              });
            }
          } catch (err) {
            this.logger.error(`24h reminder failed for booking ${booking.id}: ${(err as Error).message}`);
          }
        }

        const in2h = new Date(now.getTime() + 2 * MS.HOUR);
        const window2hStart = new Date(in2h.getTime() - 15 * MS.MINUTE);
        const window2hEnd = new Date(in2h.getTime() + 15 * MS.MINUTE);

        const bookings2h = await this.prisma.booking.findMany({
          where: {
            status: 'CONFIRMED',
            date: { gte: window2hStart, lte: window2hEnd },
          },
          include: { customer: true, business: true },
        });

        for (const booking of bookings2h) {
          try {
            if (booking.customerId) {
              await this.notifications.enqueue('reminder-2h', booking.customerId, {
                bookingId: booking.id,
                businessName: booking.business?.name ?? '',
                date: booking.date,
              });
            }
          } catch (err) {
            this.logger.error(`2h reminder failed for booking ${booking.id}: ${(err as Error).message}`);
          }
        }

        this.logger.log(`Reminders sent: ${bookings24h.length} (24h), ${bookings2h.length} (2h)`);
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
        const completed = await this.prisma.booking.findMany({
          where: {
            status: 'COMPLETED',
          },
          include: { customer: true },
        });

        for (const booking of completed) {
          try {
            if (booking.customerId) {
              await this.notifications.notifyReviewRequest(booking.id);
            }
          } catch (err) {
            this.logger.error(`Review request failed for booking ${booking.id}: ${(err as Error).message}`);
          }
        }

        this.logger.log(`Review requests sent for ${completed.length} bookings`);
      } catch (err) {
        this.logger.error(`Review request cron failed: ${(err as Error).message}`);
      }
    };

    this.addInterval(run, MS.DAY);
    run();
  }
}
