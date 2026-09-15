import {
  Controller, Get, Put, Delete, Patch, Param, Query, Body, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { AdminBookingService } from './admin-booking.service';
import { AdminReviewService } from './admin-review.service';
import { AdminReportService } from './admin-report.service';
import { ListUsersDto } from './dto/list-users.dto';
import { DeactivateUserDto } from './dto/deactivate-user.dto';
import { ListBusinessesDto } from './dto/list-businesses.dto';
import { VerifyBusinessDto } from './dto/verify-business.dto';
import { DeactivateBusinessDto } from './dto/deactivate-business.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { ListReviewsDto } from './dto/list-reviews.dto';
import { HideReviewDto } from './dto/hide-review.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { AuditLogDto } from './dto/audit-log.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly bookingService: AdminBookingService,
    private readonly reviewService: AdminReviewService,
    private readonly reportService: AdminReportService,
  ) {}

  // ─── Dashboard ──────────────────────────────────────────────

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardMetrics();
  }

  // ─── User Management ────────────────────────────────────────

  @Get('users')
  async listUsers(@Query() query: ListUsersDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Put('users/:id/activate')
  async activateUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.activateUser(id);
  }

  @Put('users/:id/deactivate')
  async deactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DeactivateUserDto,
  ) {
    return this.adminService.deactivateUser(id, body.reason);
  }

  // ─── Business Management ────────────────────────────────────

  @Get('businesses')
  async listBusinesses(@Query() query: ListBusinessesDto) {
    return this.adminService.listBusinesses(query);
  }

  @Get('businesses/:id')
  async getBusiness(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getBusinessDetail(id);
  }

  @Put('businesses/:id/verify')
  async verifyBusiness(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: VerifyBusinessDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.verifyBusiness(id, body, adminId);
  }

  @Put('businesses/:id/deactivate')
  async deactivateBusiness(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DeactivateBusinessDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.deactivateBusiness(id, body.reason, adminId);
  }

  // ─── Booking Management ─────────────────────────────────────

  @Get('bookings')
  async listBookings(@Query() query: ListBookingsDto) {
    return this.bookingService.listBookings(query);
  }

  @Get('bookings/:id')
  async getBooking(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingService.getBookingDetail(id);
  }

  @Delete('bookings/:id')
  async cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelBookingDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.bookingService.cancelBooking(id, body.reason, adminId);
  }

  // ─── Reviews Moderation ─────────────────────────────────────

  @Get('reviews')
  async listReviews(@Query() query: ListReviewsDto) {
    return this.reviewService.listReviews(query);
  }

  @Patch('reviews/:id/hide')
  async hideReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: HideReviewDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.reviewService.hideReview(id, body.reason, adminId);
  }

  @Patch('reviews/:id/unhide')
  async unhideReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.reviewService.unhideReview(id, adminId);
  }

  // ─── Reports & Audit ────────────────────────────────────────

  @Get('reports')
  async generateReport(
    @Query() query: GenerateReportDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.reportService.generateReport(query, adminId);
  }

  @Get('reports/:jobId')
  async getReportStatus(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.reportService.getReportStatus(jobId);
  }

  @Get('audit')
  async getAuditLog(@Query() query: AuditLogDto) {
    return this.reportService.getAuditLog(query);
  }
}
