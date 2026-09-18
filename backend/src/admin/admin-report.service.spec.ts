import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminReportService } from './admin-report.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { R2Service } from '../libs/r2/r2.service';
import { CsvService } from '../libs/csv/csv.service';

describe('AdminReportService', () => {
  let service: AdminReportService;
  let prisma: any;
  let r2: any;
  let csv: any;

  beforeEach(async () => {
    prisma = {
      reportJob: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      booking: { findMany: jest.fn() },
      payment: { findMany: jest.fn() },
      business: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
      auditLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    r2 = {
      upload: jest.fn().mockResolvedValue('https://r2.example.com/report.csv?signed=abc'),
    };

    csv = {
      generate: jest.fn().mockReturnValue('header1,header2\nval1,val2'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminReportService,
        { provide: PrismaService, useValue: prisma },
        { provide: R2Service, useValue: r2 },
        { provide: CsvService, useValue: csv },
      ],
    }).compile();

    service = module.get<AdminReportService>(AdminReportService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('generateReport', () => {
    it('should generate a bookings report with CSV and upload', async () => {
      const mockJob = {
        id: 'job1',
        type: 'bookings',
        status: 'PROCESSING',
        filters: { from: '2026-09-01', to: '2026-09-14' },
        createdAt: new Date(),
      };
      prisma.reportJob.create.mockResolvedValue(mockJob);
      prisma.booking.findMany.mockResolvedValue([{ id: 'b1', status: 'COMPLETED' }]);
      prisma.reportJob.update.mockResolvedValue({
        ...mockJob,
        status: 'COMPLETED',
        fileUrl: 'https://r2.example.com/report.csv?signed=abc',
        rowcount: 1,
        completedAt: new Date(),
      });

      const result = await service.generateReport({
        from: '2026-09-01',
        to: '2026-09-14',
        type: 'bookings',
      }, 'admin1');

      expect(result.data.jobId).toBe('job1');
      expect(result.data.status).toBe('COMPLETED');
      expect(result.data.downloadUrl).toContain('r2.example.com');
      expect(result.data.rowcount).toBe(1);
      expect(r2.upload).toHaveBeenCalledWith(
        expect.stringContaining('job1-bookings'),
        expect.any(String),
        'text/csv',
      );
      expect(csv.generate).toHaveBeenCalled();
    });

    it('should generate a revenue report', async () => {
      prisma.reportJob.create.mockResolvedValue({
        id: 'job2', type: 'revenue', status: 'PROCESSING', createdAt: new Date(),
      });
      prisma.payment.findMany.mockResolvedValue([{ id: 'p1', amount: 2500 }]);
      prisma.reportJob.update.mockResolvedValue({
        id: 'job2', type: 'revenue', status: 'COMPLETED', fileUrl: 'url', rowcount: 1,
        completedAt: new Date(), createdAt: new Date(),
      });

      const result = await service.generateReport({
        from: '2026-09-01',
        to: '2026-09-14',
        type: 'revenue',
      }, 'admin1');

      expect(result.data.status).toBe('COMPLETED');
      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('should generate a businesses report', async () => {
      prisma.reportJob.create.mockResolvedValue({
        id: 'job3', type: 'businesses', status: 'PROCESSING', createdAt: new Date(),
      });
      prisma.business.findMany.mockResolvedValue([{ id: 'biz1', name: 'Wash Co' }]);
      prisma.reportJob.update.mockResolvedValue({
        id: 'job3', type: 'businesses', status: 'COMPLETED', fileUrl: 'url', rowcount: 1,
        completedAt: new Date(), createdAt: new Date(),
      });

      const result = await service.generateReport({
        from: '2026-09-01',
        to: '2026-09-14',
        type: 'businesses',
      }, 'admin1');

      expect(result.data.status).toBe('COMPLETED');
      expect(prisma.business.findMany).toHaveBeenCalled();
    });

    it('should generate a users report', async () => {
      prisma.reportJob.create.mockResolvedValue({
        id: 'job4', type: 'users', status: 'PROCESSING', createdAt: new Date(),
      });
      prisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'test@test.com' }]);
      prisma.reportJob.update.mockResolvedValue({
        id: 'job4', type: 'users', status: 'COMPLETED', fileUrl: 'url', rowcount: 1,
        completedAt: new Date(), createdAt: new Date(),
      });

      const result = await service.generateReport({
        from: '2026-09-01',
        to: '2026-09-14',
        type: 'users',
      }, 'admin1');

      expect(result.data.status).toBe('COMPLETED');
    });

    it('should apply businessId filter for bookings', async () => {
      prisma.reportJob.create.mockResolvedValue({
        id: 'job5', type: 'bookings', status: 'PROCESSING', createdAt: new Date(),
      });
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.reportJob.update.mockResolvedValue({
        id: 'job5', type: 'bookings', status: 'COMPLETED', fileUrl: null, rowcount: 0,
        completedAt: new Date(), createdAt: new Date(),
      });

      await service.generateReport({
        from: '2026-09-01',
        to: '2026-09-14',
        type: 'bookings',
        businessId: 'b1',
      }, 'admin1');

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ businessId: 'b1' }),
        }),
      );
    });

    it('should handle empty data (no CSV upload)', async () => {
      prisma.reportJob.create.mockResolvedValue({
        id: 'job6', type: 'bookings', status: 'PROCESSING', createdAt: new Date(),
      });
      prisma.booking.findMany.mockResolvedValue([]);
      csv.generate.mockReturnValue('');
      prisma.reportJob.update.mockResolvedValue({
        id: 'job6', type: 'bookings', status: 'COMPLETED', fileUrl: null, rowcount: 0,
        completedAt: new Date(), createdAt: new Date(),
      });

      const result = await service.generateReport({
        from: '2026-09-01',
        to: '2026-09-14',
        type: 'bookings',
      }, 'admin1');

      expect(result.data.status).toBe('COMPLETED');
      expect(result.data.rowcount).toBe(0);
      expect(r2.upload).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for date range > 90 days', async () => {
      await expect(service.generateReport({
        from: '2026-01-01',
        to: '2026-06-01',
        type: 'bookings',
      }, 'admin1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for end date before start date', async () => {
      await expect(service.generateReport({
        from: '2026-09-30',
        to: '2026-09-01',
        type: 'bookings',
      }, 'admin1')).rejects.toThrow(BadRequestException);
    });

    it('should update job to FAILED on error', async () => {
      prisma.reportJob.create.mockResolvedValue({
        id: 'job7', type: 'bookings', status: 'PROCESSING', createdAt: new Date(),
      });
      prisma.booking.findMany.mockRejectedValue(new Error('DB connection lost'));
      prisma.reportJob.update.mockResolvedValue({});

      const result = await service.generateReport({
        from: '2026-09-01',
        to: '2026-09-14',
        type: 'bookings',
      }, 'admin1');

      expect(result.data.status).toBe('FAILED');
      expect(result.data.error).toBe('DB connection lost');
      expect(prisma.reportJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job7' },
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });

    it('should set status to PROCESSING when job is created', async () => {
      prisma.reportJob.create.mockResolvedValue({
        id: 'job8', type: 'bookings', status: 'PROCESSING', createdAt: new Date(),
      });
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.reportJob.update.mockResolvedValue({
        id: 'job8', status: 'COMPLETED', rowcount: 0, completedAt: new Date(), createdAt: new Date(),
      });

      await service.generateReport({
        from: '2026-09-01',
        to: '2026-09-14',
        type: 'bookings',
      }, 'admin1');

      expect(prisma.reportJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PROCESSING' }),
        }),
      );
    });
  });

  describe('getReportStatus', () => {
    it('should return report job status', async () => {
      prisma.reportJob.findUnique.mockResolvedValue({
        id: 'job1',
        type: 'bookings',
        status: 'COMPLETED',
        fileUrl: 'https://r2.example.com/report.csv?signed=abc',
        rowcount: 150,
        error: null,
        createdAt: new Date(),
        completedAt: new Date(),
      });

      const result = await service.getReportStatus('job1');
      expect(result.data.status).toBe('COMPLETED');
      expect(result.data.downloadUrl).toContain('r2.example.com');
      expect(result.data.rowcount).toBe(150);
    });

    it('should return FAILED status with error message', async () => {
      prisma.reportJob.findUnique.mockResolvedValue({
        id: 'job2',
        type: 'revenue',
        status: 'FAILED',
        fileUrl: null,
        rowcount: null,
        error: 'DB connection lost',
        createdAt: new Date(),
        completedAt: null,
      });

      const result = await service.getReportStatus('job2');
      expect(result.data.status).toBe('FAILED');
      expect(result.data.error).toBe('DB connection lost');
      expect(result.data.downloadUrl).toBeNull();
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
