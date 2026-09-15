import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminBookingService } from './admin-booking.service';
import { AdminReviewService } from './admin-review.service';
import { AdminReportService } from './admin-report.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { CacheModule } from '../libs/cache/cache.module';
import { AuditModule } from '../libs/audit/audit.module';
import { EmailModule } from '../libs/email/email.module';

@Module({
  imports: [PrismaModule, CacheModule, AuditModule, EmailModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminBookingService,
    AdminReviewService,
    AdminReportService,
  ],
  exports: [
    AdminService,
    AdminBookingService,
    AdminReviewService,
    AdminReportService,
  ],
})
export class AdminModule {}
