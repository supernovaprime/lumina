import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { SlotGeneratorService } from './slot-generator.service';
import { SlotReconcilerService } from './slot-reconciler.service';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { CacheModule } from '../libs/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [
    BusinessController,
    ServiceController,
    AvailabilityController,
    BookingController,
    ReviewController,
    AnalyticsController,
  ],
  providers: [
    BusinessService,
    ServiceService,
    AvailabilityService,
    SlotGeneratorService,
    SlotReconcilerService,
    BookingService,
    ReviewService,
    AnalyticsService,
  ],
  exports: [
    BusinessService,
    ServiceService,
    AvailabilityService,
    SlotGeneratorService,
    SlotReconcilerService,
    BookingService,
    ReviewService,
    AnalyticsService,
  ],
})
export class BusinessModule {}
