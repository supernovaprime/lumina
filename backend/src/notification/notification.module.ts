import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { EmailModule } from '../libs/email/email.module';
import { SmsModule } from '../libs/sms/sms.module';

@Module({
  imports: [PrismaModule, EmailModule, SmsModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
