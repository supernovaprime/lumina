import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { AuditLogDto } from './dto/audit-log.dto';

@Injectable()
export class AdminReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(dto: GenerateReportDto, adminId: string) {
    const fromDate = new Date(dto.from);
    const toDate = new Date(dto.to);
    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > 90) {
      throw new BadRequestException('Date range cannot exceed 90 days');
    }

    const job = await this.prisma.reportJob.create({
      data: {
        adminId,
        type: dto.type,
        status: 'PENDING',
        filters: {
          from: dto.from,
          to: dto.to,
          businessId: dto.businessId,
        },
      },
    });

    // TODO: Enqueue BullMQ job for background CSV generation
    // await this.queue.add('report-export', { jobId: job.id });

    return {
      data: {
        jobId: job.id,
        status: 'PENDING',
        message: 'Report generation started',
      },
    };
  }

  async getReportStatus(jobId: string) {
    const job = await this.prisma.reportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) throw new NotFoundException('Report job not found');

    return {
      data: {
        id: job.id,
        type: job.type,
        status: job.status,
        fileUrl: job.fileUrl,
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
}
