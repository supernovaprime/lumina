import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { EditReviewDto } from './dto/edit-review.dto';
import { RespondToReviewDto } from './dto/respond-to-review.dto';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @Roles('CUSTOMER')
  @HttpCode(201)
  create(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(user.userId, dto);
  }

  @Patch(':id')
  @Roles('CUSTOMER')
  edit(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: EditReviewDto) {
    return this.reviewService.edit(user.userId, id, dto);
  }

  @Post(':id/respond')
  @Roles('BUSINESS')
  @HttpCode(201)
  respond(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RespondToReviewDto,
  ) {
    return this.reviewService.respond(id, user.userId, dto.response);
  }

  @Patch(':id/respond')
  @Roles('BUSINESS')
  editResponse(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RespondToReviewDto,
  ) {
    return this.reviewService.respond(id, user.userId, dto.response, true);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(200)
  delete(@Param('id') id: string) {
    return this.reviewService.delete(id);
  }

  @Get('business/:businessId')
  findByBusiness(
    @Param('businessId') businessId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewService.findByBusiness(
      businessId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
