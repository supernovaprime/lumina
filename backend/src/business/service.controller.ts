import { Controller, Get, Post, Patch, Delete, Put, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { ServiceService } from './service.service';
import { BusinessService } from './business.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SetPriceModifiersDto } from './dto/price-modifier.dto';

@Controller('businesses/:businessId/services')
export class ServiceController {
  constructor(
    private readonly serviceService: ServiceService,
    private readonly businessService: BusinessService,
  ) {}

  @Get()
  async findAll(
    @Param('businessId') businessId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.serviceService.findAll(businessId, activeOnly !== 'false');
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  async create(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateServiceDto,
  ) {
    await this.assertOwner(businessId, userId);
    return this.serviceService.create(businessId, dto);
  }

  @Patch(':serviceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  async update(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    await this.assertOwner(businessId, userId);
    return this.serviceService.update(businessId, serviceId, dto);
  }

  @Delete(':serviceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  async remove(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.assertOwner(businessId, userId);
    return this.serviceService.remove(businessId, serviceId);
  }

  @Put(':serviceId/modifiers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  async setModifiers(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SetPriceModifiersDto,
  ) {
    await this.assertOwner(businessId, userId);
    return this.serviceService.setModifiers(businessId, serviceId, dto.modifiers);
  }

  private async assertOwner(businessId: string, userId: string) {
    const business = await this.businessService.findById(businessId);
    if (business.ownerId !== userId) {
      throw new BadRequestException('You can only manage services for your own business');
    }
  }
}
