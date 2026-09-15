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
