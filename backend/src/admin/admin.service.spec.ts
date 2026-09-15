import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { AuditService } from '../libs/audit/audit.service';
import { EmailService } from '../libs/email/email.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;
  let cache: any;
  let audit: any;
  let email: any;

  beforeEach(async () => {
    prisma = {
      booking: { count: jest.fn().mockResolvedValue(42) },
      payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1250000 } }) },
      business: { count: jest.fn()
        .mockResolvedValueOnce(87)
        .mockResolvedValueOnce(5),
      },
      user: { count: jest.fn().mockResolvedValue(3240) },
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      invalidate: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    audit = {
      write: jest.fn().mockResolvedValue(undefined),
    };

    email = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
        { provide: AuditService, useValue: audit },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    it('should return cached metrics if available', async () => {
      const cachedMetrics = {
        bookingsToday: 10,
        revenueMTD: 500000,
        activeBusinesses: 50,
        pendingVerifications: 2,
        totalUsers: 1000,
      };

      cache.get.mockResolvedValue(cachedMetrics);

      const result = await service.getDashboardMetrics();

      expect(result).toEqual(cachedMetrics);
      expect(cache.get).toHaveBeenCalled();
      expect(prisma.booking.count).not.toHaveBeenCalled();
    });

    it('should query database and cache result on cache miss', async () => {
      const result = await service.getDashboardMetrics();

      expect(result).toEqual({
        bookingsToday: 42,
        revenueMTD: 1250000,
        activeBusinesses: 87,
        pendingVerifications: 5,
        totalUsers: 3240,
      });

      expect(prisma.booking.count).toHaveBeenCalled();
      expect(prisma.payment.aggregate).toHaveBeenCalled();
      expect(prisma.business.count).toHaveBeenCalledTimes(2);
      expect(prisma.user.count).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
    });

    it('should handle zero revenue gracefully', async () => {
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.getDashboardMetrics() as any;

      expect(result.revenueMTD).toBe(0);
    });

    it('should run all queries in parallel', async () => {
      const start = Date.now();

      prisma.booking.count.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(42), 10))
      );
      prisma.payment.aggregate.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ _sum: { amount: 100 } }), 10))
      );
      prisma.business.count.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(10), 10))
      );
      prisma.user.count.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(100), 10))
      );

      await service.getDashboardMetrics();

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });
});
