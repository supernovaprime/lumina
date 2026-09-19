import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { AuditService } from '../libs/audit/audit.service';
import { EmailService } from '../libs/email/email.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;
  let cache: any;
  let audit: any;
  let email: any;

  beforeEach(async () => {
    prisma = {
      booking: { count: jest.fn().mockResolvedValue(42), updateMany: jest.fn() },
      payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1250000 } }) },
      business: {
        count: jest.fn()
          .mockResolvedValueOnce(87)
          .mockResolvedValueOnce(5),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      user: {
        count: jest.fn().mockResolvedValue(3240),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: { deleteMany: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
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

  afterEach(() => jest.clearAllMocks());

  describe('getDashboardMetrics', () => {
    it('returns cached metrics if available', async () => {
      const cachedMetrics = { bookingsToday: 10, revenueMTD: 500000 };
      cache.get.mockResolvedValue(cachedMetrics);

      const result = await service.getDashboardMetrics();
      expect(result).toEqual(cachedMetrics);
      expect(prisma.booking.count).not.toHaveBeenCalled();
    });

    it('queries database and caches on miss', async () => {
      const result = await service.getDashboardMetrics();
      expect(result).toEqual({
        bookingsToday: 42,
        revenueMTD: 1250000,
        activeBusinesses: 87,
        pendingVerifications: 5,
        totalUsers: 3240,
      });
      expect(cache.set).toHaveBeenCalled();
    });

    it('handles zero revenue', async () => {
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
      const result = await service.getDashboardMetrics() as any;
      expect(result.revenueMTD).toBe(0);
    });
  });

  describe('listUsers', () => {
    it('returns paginated users', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', email: 'test@test.com', role: 'CUSTOMER', isActive: true, customer: { _count: { vehicles: 2, bookings: 5 } }, business: null },
      ]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.listUsers({});
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('filters by role', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.listUsers({ role: 'ADMIN' });
      const call = prisma.user.findMany.mock.calls[0][0];
      expect(call.where.role).toBe('ADMIN');
    });

    it('searches by query', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.listUsers({ q: 'john' });
      const call = prisma.user.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
    });
  });

  describe('getUserDetail', () => {
    it('returns user detail', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', email: 'test@test.com', role: 'CUSTOMER', isActive: true,
        customer: { firstName: 'John', lastName: 'Doe', vehicles: [], bookings: [], _count: { reviews: 2, favorites: 3 } },
        business: null,
      });

      const result = await service.getUserDetail('u1');
      expect(result.data.id).toBe('u1');
    });

    it('throws NotFoundException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserDetail('u999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateUser', () => {
    it('activates inactive user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: false });
      prisma.user.update.mockResolvedValue({});

      const result = await service.activateUser('u1');
      expect(result.data.isActive).toBe(true);
    });

    it('throws if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.activateUser('u999')).rejects.toThrow(NotFoundException);
    });

    it('throws if already active', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: true });
      await expect(service.activateUser('u1')).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivateUser', () => {
    it('deactivates user with transaction', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', isActive: true, email: 'test@test.com', customer: { id: 'c1' }, business: null,
      });
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.user.update.mockResolvedValue({});
        prisma.refreshToken.deleteMany.mockResolvedValue({});
        prisma.booking.updateMany.mockResolvedValue({ count: 3 });
        prisma.auditLog.create.mockResolvedValue({});
        return fn(prisma);
      });

      const result = await service.deactivateUser('u1', 'Violation');
      expect(result.data.isActive).toBe(false);
      expect(result.data.bookingsCancelled).toBe(3);
      expect(email.send).toHaveBeenCalled();
    });

    it('throws if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.deactivateUser('u999')).rejects.toThrow(NotFoundException);
    });

    it('throws if already inactive', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: false, customer: null, business: null });
      await expect(service.deactivateUser('u1')).rejects.toThrow(ConflictException);
    });
  });

  describe('listBusinesses', () => {
    it('returns paginated businesses', async () => {
      prisma.business.findMany.mockResolvedValue([
        { id: 'b1', name: 'Wash Co', owner: { id: 'u1', email: 'o@test.com' }, _count: { services: 3, bookings: 10 } },
      ]);
      prisma.business.count.mockResolvedValue(1);

      const result = await service.listBusinesses({});
      expect(result.data).toHaveLength(1);
    });

    it('filters by status', async () => {
      prisma.business.findMany.mockResolvedValue([]);
      prisma.business.count.mockResolvedValue(0);

      await service.listBusinesses({ status: 'APPROVED' });
      const call = prisma.business.findMany.mock.calls[0][0];
      expect(call.where.verificationStatus).toBe('APPROVED');
    });
  });

  describe('getBusinessDetail', () => {
    it('returns business with revenue', async () => {
      prisma.business.findUnique.mockResolvedValue({
        id: 'b1', name: 'Wash Co', owner: { id: 'u1', email: 'o@test.com' }, services: [], _count: { bookings: 10, reviews: 5 },
      });
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });

      const result = await service.getBusinessDetail('b1');
      expect(result.data.totalRevenue).toBe(5000);
    });

    it('throws if not found', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      await expect(service.getBusinessDetail('b999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyBusiness', () => {
    it('approves business', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'b1', verificationStatus: 'PENDING', email: 'b@test.com', name: 'Wash' });
      prisma.business.update.mockResolvedValue({});

      const result = await service.verifyBusiness('b1', { action: 'APPROVE' }, 'admin1');
      expect(result.data.verificationStatus).toBe('APPROVED');
      expect(audit.write).toHaveBeenCalled();
      expect(cache.invalidate).toHaveBeenCalled();
      expect(email.send).toHaveBeenCalled();
    });

    it('rejects business with reason', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'b1', verificationStatus: 'PENDING', email: 'b@test.com', name: 'Wash' });
      prisma.business.update.mockResolvedValue({});

      const result = await service.verifyBusiness('b1', { action: 'REJECT', reason: 'Incomplete docs' }, 'admin1');
      expect(result.data.verificationStatus).toBe('REJECTED');
    });

    it('throws if not pending', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'b1', verificationStatus: 'APPROVED' });
      await expect(service.verifyBusiness('b1', { action: 'APPROVE' }, 'admin1')).rejects.toThrow(ConflictException);
    });

    it('throws if not found', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      await expect(service.verifyBusiness('b999', { action: 'APPROVE' }, 'admin1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateBusiness', () => {
    it('deactivates business', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'b1' });
      prisma.business.update.mockResolvedValue({});

      const result = await service.deactivateBusiness('b1', 'Violating terms', 'admin1');
      expect(result.data.isActive).toBe(false);
      expect(audit.write).toHaveBeenCalled();
    });

    it('throws if not found', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      await expect(service.deactivateBusiness('b999')).rejects.toThrow(NotFoundException);
    });
  });
});
