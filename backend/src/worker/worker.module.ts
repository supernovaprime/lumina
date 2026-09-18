import { Module } from '@nestjs/common';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { EmailModule } from '../libs/email/email.module';
import { SmsModule } from '../libs/sms/sms.module';
import { RedisModule } from '../libs/redis/redis.module';
import { BusinessModule } from '../business/business.module';
import { NotificationModule } from '../notification/notification.module';
import { SendEmailProcessor } from './processors/send-email.processor';
import { SendSmsProcessor } from './processors/send-sms.processor';
import { SendRemindersProcessor } from './processors/send-reminders.processor';
import { BookingHoldExpiryProcessor } from './processors/booking-hold-expiry.processor';
import { GenerateSlotsProcessor } from './processors/generate-slots.processor';
import { ReconcileSlotsProcessor } from './processors/reconcile-slots.processor';
import { ReviewRequestProcessor } from './processors/review-request.processor';
import { WorkerCronService } from './worker-cron.service';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    SmsModule,
    RedisModule,
    BusinessModule,
    NotificationModule,
  ],
  providers: [
    SendEmailProcessor,
    SendSmsProcessor,
    SendRemindersProcessor,
    BookingHoldExpiryProcessor,
    GenerateSlotsProcessor,
    ReconcileSlotsProcessor,
    ReviewRequestProcessor,
    WorkerCronService,
  ],
  exports: [
    SendEmailProcessor,
    SendSmsProcessor,
    SendRemindersProcessor,
    BookingHoldExpiryProcessor,
    GenerateSlotsProcessor,
    ReconcileSlotsProcessor,
    ReviewRequestProcessor,
    WorkerCronService,
  ],
})
export class WorkerModule {}
