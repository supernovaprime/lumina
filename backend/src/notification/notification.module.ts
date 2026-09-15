import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { EmailModule } from '../libs/email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
