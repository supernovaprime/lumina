import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { VehicleService } from './vehicle.service';
import { BookingHistoryService } from './booking-history.service';
import { FavoriteService } from './favorite.service';
import { PrismaModule } from '../libs/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerController],
  providers: [VehicleService, BookingHistoryService, FavoriteService],
  exports: [VehicleService, BookingHistoryService, FavoriteService],
})
export class CustomerModule {}
