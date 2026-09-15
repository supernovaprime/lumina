import { Controller, Get, Put, Query, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { AvailabilityService } from './availability.service';
import { BusinessService } from './business.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Controller('businesses/:businessId')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly businessService: BusinessService,
  ) {}

  @Get('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  async getTemplate(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.assertOwner(businessId, userId);
    return this.availabilityService.getTemplate(businessId);
  }

  @Put('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  async updateTemplate(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    await this.assertOwner(businessId, userId);
    return this.availabilityService.updateTemplate(businessId, dto);
  }

  @Get('slots')
  async getSlots(
    @Param('businessId') businessId: string,
    @Query('date') date: string,
    @Query('serviceId') serviceId?: string,
  ) {
    if (!date) {
      throw new BadRequestException('date query parameter is required');
    }
    return this.availabilityService.getSlots(businessId, date, serviceId);
  }

  private async assertOwner(businessId: string, userId: string) {
    const business = await this.businessService.findById(businessId);
    if (business.ownerId !== userId) {
      throw new BadRequestException('You can only manage your own business');
    }
  }
}
