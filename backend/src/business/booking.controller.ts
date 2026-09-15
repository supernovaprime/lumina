import { Controller, Get, Patch, Param, Query, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { BookingService } from './booking.service';
import { BusinessService } from './business.service';

@Controller('businesses/:businessId/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('BUSINESS')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly businessService: BusinessService,
  ) {}

  @Get()
  async list(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    await this.assertOwner(businessId, userId);
    return this.bookingService.listByBusiness(businessId, {
      date,
      status,
      page: Number(page) || 1,
    });
  }

  @Get(':bookingId')
  async findOne(
    @Param('businessId') businessId: string,
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.assertOwner(businessId, userId);
    return this.bookingService.findById(businessId, bookingId);
  }

  @Patch(':bookingId')
  async updateStatus(
    @Param('businessId') businessId: string,
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
    @Body('action') action: string,
  ) {
    await this.assertOwner(businessId, userId);
    return this.bookingService.updateStatus(businessId, bookingId, action);
  }

  private async assertOwner(businessId: string, userId: string) {
    const business = await this.businessService.findById(businessId);
    if (business.ownerId !== userId) {
      throw new BadRequestException('You can only manage bookings for your own business');
    }
  }
}
