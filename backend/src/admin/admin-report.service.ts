import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { R2Service } from '../libs/r2/r2.service';
import { CsvService, CsvColumn } from '../libs/csv/csv.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { AuditLogDto } from './dto/audit-log.dto';

@Injectable()
export class AdminReportService {
  private readonly logger = new Logger(AdminReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly csv: CsvService,
  ) {}

  async generateReport(dto: GenerateReportDto, adminId: string) {
    const fromDate = new Date(dto.from);
    const toDate = new Date(dto.to);
    const diffDays = Math.ceil(
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays > 90) {
      throw new BadRequestException('Date range cannot exceed 90 days');
    }
    if (diffDays < 0) {
      throw new BadRequestException('End date must be after start date');
    }

    const job = await this.prisma.reportJob.create({
      data: {
        adminId,
        type: dto.type,
        status: 'PROCESSING',
        filters: {
          from: dto.from,
          to: dto.to,
          businessId: dto.businessId,
        },
      },
    });

    try {
      const data = await this.queryReportData(dto.type, dto.from, dto.to, dto.businessId);
      const columns = this.getColumnsForType(dto.type);
      const csvContent = this.csv.generate(data, columns);

      if (csvContent) {
        const key = `reports/${job.id}-${dto.type}-${dto.from}-${dto.to}.csv`;
        const presignedUrl = await this.r2.upload(key, csvContent, 'text/csv');

        const updated = await this.prisma.reportJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            fileUrl: presignedUrl,
            rowcount: data.length,
            completedAt: new Date(),
          },
        });

        return {
          data: {
            jobId: updated.id,
            status: updated.status,
            downloadUrl: updated.fileUrl,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            rowcount: updated.rowcount,
            createdAt: updated.createdAt,
            completedAt: updated.completedAt,
          },
        };
      }

      const updated = await this.prisma.reportJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          rowcount: 0,
          completedAt: new Date(),
        },
      });

      return {
        data: {
          jobId: updated.id,
          status: updated.status,
          downloadUrl: null,
          rowcount: 0,
          createdAt: updated.createdAt,
          completedAt: updated.completedAt,
        },
      };
    } catch (error) {
      await this.prisma.reportJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      this.logger.error(`Report generation failed for job ${job.id}: ${error}`);

      return {
        data: {
          jobId: job.id,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          createdAt: job.createdAt,
        },
      };
    }
  }

  async getReportStatus(jobId: string) {
    const job = await this.prisma.reportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) throw new NotFoundException('Report job not found');

    return {
      data: {
        jobId: job.id,
        type: job.type,
        status: job.status,
        downloadUrl: job.fileUrl,
        expiresAt: job.fileUrl ? new Date(Date.now() + 60 * 60 * 1000) : null,
        rowcount: job.rowcount,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      },
    };
  }

  async getAuditLog(dto: AuditLogDto) {
    const { entity, action, actorId, from, to, page = 1, limit = 50 } = dto;

    const where: any = {};
    if (entity) where.entityType = entity;
    if (action) where.action = action;
    if (actorId) where.actorId = actorId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: entries,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private async queryReportData(
    type: string,
    from: string,
    to: string,
    businessId?: string,
  ): Promise<any[]> {
    const dateRange = { gte: new Date(from), lte: new Date(to) };

    switch (type) {
      case 'bookings': {
        const where: any = { createdAt: dateRange };
        if (businessId) where.businessId = businessId;
        return this.prisma.booking.findMany({
          where,
          include: {
            customer: { select: { firstName: true, lastName: true } },
            business: { select: { name: true } },
            service: { select: { name: true, basePrice: true } },
            vehicle: { select: { make: true, model: true, type: true } },
          },
        });
      }
      case 'revenue': {
        const where: any = {
          status: 'COMPLETED',
          createdAt: dateRange,
        };
        if (businessId) where.booking = { businessId };
        return this.prisma.payment.findMany({
          where,
          include: {
            booking: {
              include: {
                business: { select: { name: true } },
                service: { select: { name: true } },
                customer: { select: { firstName: true, lastName: true } },
              },
            },
          },
        });
      }
      case 'businesses':
        return this.prisma.business.findMany({
          where: { createdAt: dateRange },
          include: {
            _count: { select: { bookings: true, reviews: true, services: true } },
          },
        });
      case 'users':
        return this.prisma.user.findMany({
          where: { createdAt: dateRange },
          include: {
            customer: { select: { firstName: true, lastName: true } },
            business: { select: { name: true } },
          },
        });
      default:
        throw new BadRequestException(`Unknown report type: ${type}`);
    }
  }

  private getColumnsForType(type: string): CsvColumn[] {
    switch (type) {
      case 'bookings':
        return [
          { header: 'ID', accessor: (r) => r.id },
          { header: 'Date', accessor: (r) => r.createdAt?.toISOString?.() ?? String(r.createdAt) },
          { header: 'Customer', accessor: (r) => r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : 'N/A' },
          { header: 'Business', accessor: (r) => r.business?.name ?? 'N/A' },
          { header: 'Service', accessor: (r) => r.service?.name ?? 'N/A' },
          { header: 'Vehicle', accessor: (r) => r.vehicle ? `${r.vehicle.make} ${r.vehicle.model} (${r.vehicle.type})` : 'N/A' },
          { header: 'Status', accessor: (r) => r.status },
          { header: 'Total Price', accessor: (r) => r.totalPrice },
        ];
      case 'revenue':
        return [
          { header: 'Payment ID', accessor: (r) => r.id },
          { header: 'Date', accessor: (r) => r.createdAt?.toISOString?.() ?? String(r.createdAt) },
          { header: 'Customer', accessor: (r) => r.booking?.customer ? `${r.booking.customer.firstName} ${r.booking.customer.lastName}` : 'N/A' },
          { header: 'Business', accessor: (r) => r.booking?.business?.name ?? 'N/A' },
          { header: 'Service', accessor: (r) => r.booking?.service?.name ?? 'N/A' },
          { header: 'Amount', accessor: (r) => r.amount },
          { header: 'Currency', accessor: (r) => r.currency },
          { header: 'Method', accessor: (r) => r.method ?? 'N/A' },
          { header: 'Status', accessor: (r) => r.status },
        ];
      case 'businesses':
        return [
          { header: 'ID', accessor: (r) => r.id },
          { header: 'Name', accessor: (r) => r.name },
          { header: 'City', accessor: (r) => r.city },
          { header: 'State', accessor: (r) => r.state },
          { header: 'Verified', accessor: (r) => r.isVerified ? 'Yes' : 'No' },
          { header: 'Rating', accessor: (r) => r.rating },
          { header: 'Review Count', accessor: (r) => r._count?.reviews ?? 0 },
          { header: 'Booking Count', accessor: (r) => r._count?.bookings ?? 0 },
          { header: 'Service Count', accessor: (r) => r._count?.services ?? 0 },
          { header: 'Created At', accessor: (r) => r.createdAt?.toISOString?.() ?? String(r.createdAt) },
        ];
      case 'users':
        return [
          { header: 'ID', accessor: (r) => r.id },
          { header: 'Email', accessor: (r) => r.email },
          { header: 'Role', accessor: (r) => r.role },
          { header: 'Name', accessor: (r) => {
            if (r.customer) return `${r.customer.firstName} ${r.customer.lastName}`;
            if (r.business) return r.business.name;
            return 'N/A';
          }},
          { header: 'Active', accessor: (r) => r.isActive ? 'Yes' : 'No' },
          { header: 'Email Verified', accessor: (r) => r.emailVerified ? 'Yes' : 'No' },
          { header: 'Last Login', accessor: (r) => r.lastLoginAt?.toISOString?.() ?? 'Never' },
          { header: 'Joined', accessor: (r) => r.createdAt?.toISOString?.() ?? String(r.createdAt) },
        ];
      default:
        return [];
    }
  }
}
