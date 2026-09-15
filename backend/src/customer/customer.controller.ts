import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { VehicleService } from './vehicle.service';
import { BookingHistoryService } from './booking-history.service';
import { FavoriteService } from './favorite.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { ListCustomerBookingsDto } from './dto/list-customer-bookings.dto';

@Controller('customers/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class CustomerController {
  constructor(
    private readonly vehicleService: VehicleService,
    private readonly bookingHistoryService: BookingHistoryService,
    private readonly favoriteService: FavoriteService,
  ) {}

  @Get('vehicles')
  findAllVehicles(@CurrentUser('id') customerId: string) {
    return this.vehicleService.findAll(customerId);
  }

  @Post('vehicles')
  createVehicle(
    @CurrentUser('id') customerId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehicleService.create(customerId, dto);
  }

  @Patch('vehicles/:id')
  updateVehicle(
    @CurrentUser('id') customerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehicleService.update(customerId, id, dto);
  }

  @Delete('vehicles/:id')
  removeVehicle(
    @CurrentUser('id') customerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehicleService.remove(customerId, id);
  }

  @Get('bookings')
  findAllBookings(
    @CurrentUser('id') customerId: string,
    @Query() dto: ListCustomerBookingsDto,
  ) {
    return this.bookingHistoryService.findAll(customerId, dto);
  }

  @Get('favorites')
  findAllFavorites(@CurrentUser('id') customerId: string) {
    return this.favoriteService.findAll(customerId);
  }

  @Put('favorites/:businessId')
  addFavorite(
    @CurrentUser('id') customerId: string,
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ) {
    return this.favoriteService.add(customerId, businessId);
  }

  @Delete('favorites/:businessId')
  removeFavorite(
    @CurrentUser('id') customerId: string,
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ) {
    return this.favoriteService.remove(customerId, businessId);
  }
}
