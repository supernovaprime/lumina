import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { ReviewService } from './review.service';
import { BusinessService } from './business.service';
import { RespondReviewDto } from './dto/respond-review.dto';

@Controller()
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly businessService: BusinessService,
  ) {}

  @Get('businesses/:businessId/reviews')
  async findByBusiness(
    @Param('businessId') businessId: string,
    @Query('page') page?: string,
  ) {
    return this.reviewService.findByBusiness(businessId, Number(page) || 1);
  }

  @Post('reviews/:reviewId/response')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  async respond(
    @Param('reviewId') reviewId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RespondReviewDto,
  ) {
    return this.reviewService.respond(reviewId, userId, dto.response);
  }
}
