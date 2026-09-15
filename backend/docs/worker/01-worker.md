# Worker Module Scaffold

## Purpose
BullMQ queue processors for background jobs. Runs as a separate process on Railway.
Shares Prisma schema + Redis with main API. Not imported in app.module.ts.

For MVP: worker is a standalone NestJS app that polls Redis for jobs.
Will migrate to proper BullMQ later when Railway supports long-running processes.

## Files to create:
- `src/worker/worker.module.ts`
- `src/worker/main.ts`
- `src/worker/queues/queue-definitions.ts`
- `src/worker/processors/send-email.processor.ts`
- `src/worker/processors/send-reminders.processor.ts`
- `src/worker/processors/booking-hold-expiry.processor.ts`
- `src/worker/processors/generate-slots.processor.ts`
- `src/worker/processors/reconcile-slots.processor.ts`
- `src/worker/processors/review-request.processor.ts`

---

## `src/worker/queues/queue-definitions.ts`

```typescript
/** Queue names for background jobs. */
export const QUEUES = {
  NOTIFICATIONS: 'notifications',
  SCHEDULING: 'scheduling',
  BOOKINGS: 'bookings',
  REPORTS: 'reports',
} as const;

/** Job types within queues. */
export const JOB_TYPES = {
  SEND_EMAIL: 'send-email',
  SEND_SMS: 'send-sms',
  SEND_REMINDERS: 'send-reminders',
  GENERATE_SLOTS: 'generate-slots',
  RECONCILE_SLOTS: 'reconcile-slots',
  BOOKING_HOLD_EXPIRY: 'booking-hold-expiry',
  REVIEW_REQUEST: 'review-request',
  REPORT_EXPORT: 'report-export',
} as const;

/** Job payload interface. */
export interface JobPayload {
  type: string;
  data: Record<string, any>;
  priority?: number;
  delay?: number;
  attempts?: number;
}
```

---

## `src/worker/processors/send-email.processor.ts`

```typescript
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { EmailService } from '../../libs/email/email.service';

/**
 * Processes email send jobs from the notifications queue.
 * Reads Notification record, sends email, updates status.
 * Retry: 3 attempts with exponential backoff.
 */
export class SendEmailProcessor {
  private readonly logger = new Logger(SendEmailProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async process(notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: true },
    });

    if (!notification || notification.status !== 'PENDING') return;
    if (!notification.user?.email) {
      this.logger.warn(`No email for notification ${notificationId}`);
      return;
    }

    try {
      await this.email.send({
        to: notification.user.email,
        subject: notification.title,
        html: notification.body,
      });

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (err) {
      this.logger.error(`Email send failed: ${err.message}`);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'FAILED' },
      });
    }
  }
}
```

---

## `src/worker/processors/send-reminders.processor.ts`

```typescript
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';

/**
 * Cron job: every 15 min, find CONFIRMED bookings starting in ~24h
 * without reminder24hSent flag, send reminder email + SMS.
 */
export class SendRemindersProcessor {
  private readonly logger = new Logger(SendRemindersProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async process(): Promise<void> {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowStart = new Date(in24h.getTime() - 15 * 60 * 1000); // 24h - 15min
    const windowEnd = new Date(in24h.getTime() + 15 * 60 * 1000);   // 24h + 15min

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        startTime: { gte: windowStart, lte: windowEnd },
        reminder24hSent: false,
      },
      include: { customer: { include: { user: true } } },
    });

    for (const booking of bookings) {
      try {
        await this.notifications.notifyReviewRequest(booking.id);
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { reminder24hSent: true },
        });
        this.logger.log(`Reminder sent for booking ${booking.id}`);
      } catch (err) {
        this.logger.error(`Reminder failed for booking ${booking.id}: ${err.message}`);
      }
    }
  }
}
```

---

## `src/worker/processors/booking-hold-expiry.processor.ts`

```typescript
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';

/**
 * Cron job: every 5 min, find PENDING bookings older than 15 min
 * with no COMPLETED payment → auto-cancel + release slot.
 */
export class BookingHoldExpiryProcessor {
  private readonly logger = new Logger(BookingHoldExpiryProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(): Promise<void> {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);

    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
      },
      include: { timeSlot: true },
    });

    for (const booking of expiredBookings) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancelledBy: 'SYSTEM',
              cancelReason: 'PAYMENT_TIMEOUT',
            },
          });

          if (booking.timeSlot) {
            await tx.timeSlot.update({
              where: { id: booking.timeSlotId },
              data: {
                currentBookings: { decrement: 1 },
                isAvailable: true,
              },
            });
          }
        });

        this.logger.log(`Expired booking ${booking.id} cancelled`);
      } catch (err) {
        this.logger.error(`Failed to expire booking ${booking.id}: ${err.message}`);
      }
    }
  }
}
```

---

## `src/worker/processors/generate-slots.processor.ts`

```typescript
import { Logger } from '@nestjs/common';
import { SlotGeneratorService } from '../../business/slot-generator.service';

/**
 * Processor for generate-slots job.
 * Runs nightly + on template change.
 * Delegates to SlotGeneratorService.
 */
export class GenerateSlotsProcessor {
  private readonly logger = new Logger(GenerateSlotsProcessor.name);

  constructor(private readonly slotGenerator: SlotGeneratorService) {}

  async process(businessId: string, horizonDays: number = 30): Promise<void> {
    try {
      const result = await this.slotGenerator.generateSlots(businessId, horizonDays);
      this.logger.log(`Generated slots for ${businessId}: ${result?.created ?? 0} created`);
    } catch (err) {
      this.logger.error(`Slot generation failed for ${businessId}: ${err.message}`);
    }
  }
}
```

---

## `src/worker/processors/reconcile-slots.processor.ts`

```typescript
import { Logger } from '@nestjs/common';
import { SlotReconcilerService } from '../../business/slot-reconciler.service';

/**
 * Processor for reconcile-slots job.
 * Runs on hours change.
 * Delegates to SlotReconcilerService.
 */
export class ReconcileSlotsProcessor {
  private readonly logger = new Logger(ReconcileSlotsProcessor.name);

  constructor(private readonly slotReconciler: SlotReconcilerService) {}

  async process(businessId: string): Promise<void> {
    try {
      const result = await this.slotReconciler.reconcileFutureSlots(businessId);
      this.logger.log(`Reconciled slots for ${businessId}: ${result.deleted} deleted, ${result.conflicts} conflicts`);
    } catch (err) {
      this.logger.error(`Slot reconciliation failed for ${businessId}: ${err.message}`);
    }
  }
}
```

---

## `src/worker/processors/review-request.processor.ts`

```typescript
import { Logger } from '@nestjs/common';
import { NotificationService } from '../../notification/notification.service';

/**
 * Delayed job: 24h after COMPLETED booking, send review request.
 * Triggered by booking complete event with delay.
 */
export class ReviewRequestProcessor {
  private readonly logger = new Logger(ReviewRequestProcessor.name);

  constructor(private readonly notifications: NotificationService) {}

  async process(bookingId: string): Promise<void> {
    try {
      await this.notifications.notifyReviewRequest(bookingId);
      this.logger.log(`Review request sent for booking ${bookingId}`);
    } catch (err) {
      this.logger.error(`Review request failed for booking ${bookingId}: ${err.message}`);
    }
  }
}
```

---

## `src/worker/worker.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { EmailModule } from '../libs/email/email.module';
import { RedisModule } from '../libs/redis/redis.module';
import { BusinessModule } from '../business/business.module';
import { NotificationModule } from '../notification/notification.module';
import { SendEmailProcessor } from './processors/send-email.processor';
import { SendRemindersProcessor } from './processors/send-reminders.processor';
import { BookingHoldExpiryProcessor } from './processors/booking-hold-expiry.processor';
import { GenerateSlotsProcessor } from './processors/generate-slots.processor';
import { ReconcileSlotsProcessor } from './processors/reconcile-slots.processor';
import { ReviewRequestProcessor } from './processors/review-request.processor';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    RedisModule,
    BusinessModule,
    NotificationModule,
  ],
  providers: [
    SendEmailProcessor,
    SendRemindersProcessor,
    BookingHoldExpiryProcessor,
    GenerateSlotsProcessor,
    ReconcileSlotsProcessor,
    ReviewRequestProcessor,
  ],
  exports: [
    SendEmailProcessor,
    SendRemindersProcessor,
    BookingHoldExpiryProcessor,
    GenerateSlotsProcessor,
    ReconcileSlotsProcessor,
    ReviewRequestProcessor,
  ],
})
export class WorkerModule {}
```

---

## `src/worker/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';
import { SendRemindersProcessor } from './processors/send-reminders.processor';
import { BookingHoldExpiryProcessor } from './processors/booking-hold-expiry.processor';

/**
 * Standalone worker process for background jobs.
 * Runs on Railway as a separate dyno.
 * Polls Redis for jobs (MVP: simple setInterval polling).
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const logger = new Logger('Worker');

  logger.log('Worker starting...');

  const reminders = app.get(SendRemindersProcessor);
  const holdExpiry = app.get(BookingHoldExpiryProcessor);

  // Poll every 15 minutes for reminders
  setInterval(async () => {
    logger.log('Running reminder check...');
    await reminders.process();
  }, 15 * 60 * 1000);

  // Poll every 5 minutes for booking hold expiry
  setInterval(async () => {
    logger.log('Running hold expiry check...');
    await holdExpiry.process();
  }, 5 * 60 * 1000);

  logger.log('Worker started. Polling for jobs...');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
```
