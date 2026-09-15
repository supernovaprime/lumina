import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminReportService } from './admin-report.service';
import { PrismaService } from '../libs/prisma/prisma.service';

describe('AdminReportService', () => {
  let service: AdminReportService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      reportJob: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminReportService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdminReportService>(AdminReportService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('generateReport', () => {
    it('should create a report job', async () => {
      prisma.reportJob.create.mockResolvedValue({ id: 'job1', status: 'PENDING' });

      const result = await service.generateReport({
        from: '2026-01-01',
        to: '2026-01-31',
        type: 'bookings',
      }, 'admin1');

      expect(result.data.jobId).toBe('job1');
      expect(result.data.status).toBe('PENDING');
      expect(prisma.reportJob.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          adminId: 'admin1',
          type: 'bookings',
          status: 'PENDING',
        }),
      }));
    });

    it('should throw BadRequestException for date range > 90 days', async () => {
      await expect(service.generateReport({
        from: '2026-01-01',
        to: '2026-06-01',
        type: 'bookings',
      }, 'admin1')).rejects.toThrow(BadRequestException);
    });

    it('should accept businessId filter', async () => {
      prisma.reportJob.create.mockResolvedValue({ id: 'job2', status: 'PENDING' });

      await service.generateReport({
        from: '2026-01-01',
        to: '2026-01-31',
        type: 'revenue',
        businessId: 'b1',
      }, 'admin1');

      expect(prisma.reportJob.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          filters: expect.objectContaining({ businessId: 'b1' }),
        }),
      }));
    });
  });

  describe('getReportStatus', () => {
    it('should return report job status', async () => {
      prisma.reportJob.findUnique.mockResolvedValue({
        id: 'job1',
        type: 'bookings',
        status: 'COMPLETED',
        fileUrl: 'https://storage.example.com/reports/job1.csv',
        rowcount: 150,
        error: null,
        createdAt: new Date(),
        completedAt: new Date(),
      });

      const result = await service.getReportStatus('job1');
      expect(result.data.status).toBe('COMPLETED');
      expect(result.data.fileUrl).toBe('https://storage.example.com/reports/job1.csv');
      expect(result.data.rowcount).toBe(150);
    });

    it('should throw NotFoundException for non-existent job', async () => {
      prisma.reportJob.findUnique.mockResolvedValue(null);
      await expect(service.getReportStatus('job1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAuditLog', () => {
    it('should return paginated audit log', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'a1', action: 'BOOKING_CANCELLED_ADMIN' }]);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await service.getAuditLog({}) as any;

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 50, total: 1, totalPages: 1 });
    });

    it('should apply entity filter', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLog({ entity: 'BOOKING' });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ entityType: 'BOOKING' }),
      }));
    });

    it('should apply action filter', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLog({ action: 'REVIEW_HIDDEN' });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ action: 'REVIEW_HIDDEN' }),
      }));
    });

    it('should apply actorId filter', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLog({ actorId: 'admin1' });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ actorId: 'admin1' }),
      }));
    });

    it('should apply date range filter', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLog({ from: '2026-01-01', to: '2026-01-31' });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: new Date('2026-01-01'), lte: new Date('2026-01-31') },
        }),
      }));
    });

    it('should paginate with custom page and limit', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLog({ page: 2, limit: 25 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 25,
        take: 25,
      }));
    });
  });
});
