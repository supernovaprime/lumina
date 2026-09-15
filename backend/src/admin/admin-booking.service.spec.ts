import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminBookingService } from './admin-booking.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { AuditService } from '../libs/audit/audit.service';
import { EmailService } from '../libs/email/email.service';

describe('AdminBookingService', () => {
  let service: AdminBookingService;
  let prisma: any;
  let cache: any;
  let audit: any;
  let email: any;

  beforeEach(async () => {
    prisma = {
      booking: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      timeSlot: { update: jest.fn() },
      payment: { update: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
      invalidate: jest.fn(),
    };

    audit = { write: jest.fn() };
    email = { send: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminBookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
        { provide: AuditService, useValue: audit },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = module.get<AdminBookingService>(AdminBookingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('listBookings', () => {
    it('should return paginated bookings with defaults', async () => {
      prisma.booking.findMany.mockResolvedValue([{ id: 'bk1' }]);
      prisma.booking.count.mockResolvedValue(1);

      const result = await service.listBookings({}) as any;

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('should apply status filter', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.listBookings({ status: 'CONFIRMED' });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: 'CONFIRMED' }),
      }));
    });

    it('should apply date filter', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.listBookings({ date: '2026-01-15' });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ date: new Date('2026-01-15') }),
      }));
    });

    it('should apply date range filter', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.listBookings({ from: '2026-01-01', to: '2026-01-31' });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: new Date('2026-01-01'), lte: new Date('2026-01-31') },
        }),
      }));
    });

    it('should apply businessId and customerId filters', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.listBookings({ businessId: 'b1', customerId: 'c1' });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ businessId: 'b1', customerId: 'c1' }),
      }));
    });

    it('should paginate with custom page and limit', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.listBookings({ page: 2, limit: 10 });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 10,
        take: 10,
      }));
    });
  });

  describe('getBookingDetail', () => {
    it('should return full booking detail', async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: 'bk1', customer: {}, business: {}, service: {}, vehicle: {}, payment: {}, review: null });

      const result = await service.getBookingDetail('bk1');
      expect(result.data.id).toBe('bk1');
    });

    it('should throw NotFoundException for non-existent booking', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.getBookingDetail('bk1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelBooking', () => {
    it('should cancel a booking and refund payment', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'bk1',
        status: 'CONFIRMED',
        timeSlotId: 'ts1',
        businessId: 'b1',
        payment: { status: 'COMPLETED' },
      });
      prisma.booking.update.mockResolvedValue({ id: 'bk1', status: 'CANCELLED' });

      const result = await service.cancelBooking('bk1', 'Dispute resolved', 'admin1');

      expect(result.data.status).toBe('CANCELLED');
      expect(result.data.message).toBe('Booking cancelled');
      expect(prisma.timeSlot.update).toHaveBeenCalledWith({
        where: { id: 'ts1' },
        data: { currentBookings: { decrement: 1 } },
      });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { bookingId: 'bk1' },
        data: { status: 'REFUNDED' },
      });
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(cache.invalidate).toHaveBeenCalledWith('slots:b1:*');
    });

    it('should cancel without refund if payment not completed', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'bk1',
        status: 'PENDING',
        timeSlotId: 'ts1',
        businessId: 'b1',
        payment: { status: 'PENDING' },
      });
      prisma.booking.update.mockResolvedValue({ id: 'bk1', status: 'CANCELLED' });

      await service.cancelBooking('bk1', 'No show', 'admin1');

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('should cancel without refund if no payment', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'bk1',
        status: 'CONFIRMED',
        timeSlotId: 'ts1',
        businessId: 'b1',
        payment: null,
      });
      prisma.booking.update.mockResolvedValue({ id: 'bk1', status: 'CANCELLED' });

      await service.cancelBooking('bk1', 'No show', 'admin1');

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent booking', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.cancelBooking('bk1', 'reason', 'admin1')).rejects.toThrow(NotFoundException);
    });
  });
});
