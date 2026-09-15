import { Controller, Get, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { BusinessService } from './business.service';

@Controller('businesses/:businessId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('BUSINESS')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly businessService: BusinessService,
  ) {}

  @Get('analytics')
  async getAnalytics(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    const business = await this.businessService.findById(businessId);
    if (business.ownerId !== userId) {
      throw new BadRequestException('You can only view analytics for your own business');
    }
    return this.analyticsService.getAnalytics(businessId);
  }
}
