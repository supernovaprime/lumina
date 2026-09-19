import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { VehicleService } from './vehicle.service';
import { BookingHistoryService } from './booking-history.service';
import { FavoriteService } from './favorite.service';
import { GdprService } from './gdpr.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { EmailModule } from '../libs/email/email.module';
import { R2Module } from '../libs/r2/r2.module';
import { CacheModule } from '../libs/cache/cache.module';

@Module({
  imports: [PrismaModule, EmailModule, R2Module, CacheModule],
  controllers: [CustomerController],
  providers: [VehicleService, BookingHistoryService, FavoriteService, GdprService],
  exports: [VehicleService, BookingHistoryService, FavoriteService, GdprService],
})
export class CustomerModule {}
