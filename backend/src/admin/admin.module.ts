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
import { R2Module } from '../libs/r2/r2.module';
import { CsvModule } from '../libs/csv/csv.module';

@Module({
  imports: [PrismaModule, CacheModule, AuditModule, EmailModule, R2Module, CsvModule],
  controllers: [
    AdminController,
  ],
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
