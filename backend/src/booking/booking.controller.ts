import { Controller, Get, Post, Delete, Body, Param, Query, Headers, UseGuards, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { BookingService } from './booking.service';
import { PreviewBookingDto } from './dto/preview-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('preview')
  @Roles('CUSTOMER')
  preview(@CurrentUser() user: any, @Body() dto: PreviewBookingDto) {
    return this.bookingService.preview(user.userId, dto);
  }

  @Post()
  @Roles('CUSTOMER')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(201)
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateBookingDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    return this.bookingService.create(user.userId, dto, idempotencyKey);
  }

  @Get('me')
  @Roles('CUSTOMER')
  findMine(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('upcoming') upcoming?: string,
    @Query('page') page?: string,
  ) {
    return this.bookingService.findAll(user.userId, {
      status,
      upcoming: upcoming === 'true',
      page: page ? parseInt(page) : 1,
    });
  }

  @Get(':id')
  @Roles('CUSTOMER')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookingService.findOne(user.userId, id);
  }

  @Delete(':id')
  @Roles('CUSTOMER')
  cancel(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CancelBookingDto) {
    return this.bookingService.cancel(user.userId, id, dto.reason);
  }
}
