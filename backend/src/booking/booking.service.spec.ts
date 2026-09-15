import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { IdempotencyService } from '../libs/idempotency/idempotency.service';
import { MoneyService } from '../libs/money/money.service';
import { TimeService } from '../libs/time/time.service';
import { Decimal } from '@prisma/client/runtime/library';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: any;
  let cache: any;
  let idempotency: any;
  let money: any;
  let time: any;

  beforeEach(async () => {
    prisma = {
      vehicle: { findFirst: jest.fn() },
      service: { findFirst: jest.fn() },
      business: { findFirst: jest.fn() },
      priceModifier: { findMany: jest.fn() },
      timeSlot: { findUnique: jest.fn(), update: jest.fn() },
      booking: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
      $queryRawUnsafe: jest.fn(),
    };
    cache = { invalidate: jest.fn() };
    idempotency = { check: jest.fn(), store: jest.fn() };
    money = {
      toCents: jest.fn((d: Decimal) => Math.round(Number(d) * 100)),
      toDecimal: jest.fn((c: number) => new Decimal(c / 100)),
      resolvePrice: jest.fn((base, mult) => ({
        basePriceCents: base,
        multiplier: mult,
        unitPriceCents: Math.round(base * mult),
        totalPriceCents: Math.round(base * mult),
        currency: 'USD',
      })),
    };
    time = {
      isWithinWindow: jest.fn(() => true),
      isFreeCancel: jest.fn(() => true),
      toUTC: jest.fn(() => new Date()),
      addMinutes: jest.fn(() => new Date()),
      formatISO: jest.fn(() => '2026-09-15T10:00:00.000Z'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
        { provide: IdempotencyService, useValue: idempotency },
        { provide: MoneyService, useValue: money },
        { provide: TimeService, useValue: time },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('preview', () => {
    it('returns correct price breakdown', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', type: 'SEDAN', size: 'COMPACT' });
      prisma.service.findFirst.mockResolvedValue({ id: 's1', basePrice: new Decimal(50), durationMinutes: 30 });
      prisma.priceModifier.findMany.mockResolvedValue([]);

      const result = await service.preview('user1', {
        businessId: 'b1', serviceId: 's1', vehicleId: 'v1', date: '2026-09-20', startTime: '10:00',
      });

      expect(result.totalPriceCents).toBe(5000);
      expect(result.durationMinutes).toBe(30);
    });

    it('throws NotFoundException for invalid vehicle', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);
      await expect(service.preview('user1', {
        businessId: 'b1', serviceId: 's1', vehicleId: 'v999', date: '2026-09-20', startTime: '10:00',
      })).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for invalid service', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', type: 'SEDAN', size: 'COMPACT' });
      prisma.service.findFirst.mockResolvedValue(null);
      await expect(service.preview('user1', {
        businessId: 'b1', serviceId: 's999', vehicleId: 'v1', date: '2026-09-20', startTime: '10:00',
      })).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('returns stored response on duplicate key', async () => {
      const stored = { bookingId: 'b1', status: 'PENDING' };
      idempotency.check.mockResolvedValue(stored);

      const result = await service.create('user1', {
        businessId: 'b1', serviceId: 's1', vehicleId: 'v1', date: '2026-09-20', startTime: '10:00',
      }, 'key1');

      expect(result).toEqual(stored);
    });

    it('throws NotFoundException for unverified business', async () => {
      idempotency.check.mockResolvedValue(null);
      prisma.business.findFirst.mockResolvedValue(null);

      await expect(service.create('user1', {
        businessId: 'b1', serviceId: 's1', vehicleId: 'v1', date: '2026-09-20', startTime: '10:00',
      }, 'key1')).rejects.toThrow(NotFoundException);
    });

    it('creates booking with slot lock', async () => {
      idempotency.check.mockResolvedValue(null);
      prisma.business.findFirst.mockResolvedValue({ id: 'b1', isVerified: true, timezone: 'UTC' });
      prisma.service.findFirst.mockResolvedValue({ id: 's1', basePrice: new Decimal(50), durationMinutes: 30 });
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', type: 'SEDAN', size: 'COMPACT' });

      const mockBooking = {
        id: 'booking1',
        status: 'PENDING',
        totalPrice: new Decimal(50),
      };

      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'slot1', currentBookings: 0, maxBookings: 1, isAvailable: true }]);
        prisma.priceModifier.findMany.mockResolvedValue([]);
        prisma.booking.create.mockResolvedValue(mockBooking);
        prisma.timeSlot.update.mockResolvedValue({});
        return fn(prisma);
      });

      const result = await service.create('user1', {
        businessId: 'b1', serviceId: 's1', vehicleId: 'v1', date: '2026-09-20', startTime: '10:00',
      }, 'key1');

      expect(result.bookingId).toBe('booking1');
      expect(result.status).toBe('PENDING');
      expect(idempotency.store).toHaveBeenCalled();
      expect(cache.invalidate).toHaveBeenCalled();
    });

    it('throws ConflictException when slot is full', async () => {
      idempotency.check.mockResolvedValue(null);
      prisma.business.findFirst.mockResolvedValue({ id: 'b1', isVerified: true, timezone: 'UTC' });
      prisma.service.findFirst.mockResolvedValue({ id: 's1', basePrice: new Decimal(50), durationMinutes: 30 });
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', type: 'SEDAN', size: 'COMPACT' });

      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'slot1', currentBookings: 1, maxBookings: 1, isAvailable: false }]);
        return fn(prisma);
      });

      await expect(service.create('user1', {
        businessId: 'b1', serviceId: 's1', vehicleId: 'v1', date: '2026-09-20', startTime: '10:00',
      }, 'key1')).rejects.toThrow(ConflictException);
    });
  });

  describe('cancel', () => {
    it('returns CANCELLED status', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1', customerId: 'user1', status: 'PENDING', businessId: 'biz1', timeSlotId: 'ts1',
      });
      prisma.timeSlot.findUnique.mockResolvedValue({ id: 'ts1', startTime: new Date(Date.now() + 48 * 3600000) });
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.booking.update.mockResolvedValue({});
        prisma.timeSlot.update.mockResolvedValue({});
        return fn(prisma);
      });

      const result = await service.cancel('user1', 'b1');
      expect(result.status).toBe('CANCELLED');
    });

    it('throws NotFoundException for non-owned booking', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.cancel('user1', 'b1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for non-CANCELLED transition', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1', customerId: 'user1', status: 'COMPLETED', businessId: 'biz1', timeSlotId: 'ts1',
      });
      await expect(service.cancel('user1', 'b1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('returns booking with relations', async () => {
      const mockBooking = { id: 'b1', customerId: 'user1', business: {}, service: {}, vehicle: {}, timeSlot_rel: {} };
      prisma.booking.findFirst.mockResolvedValue(mockBooking);
      const result = await service.findOne('user1', 'b1');
      expect(result.id).toBe('b1');
    });

    it('throws NotFoundException for non-owned booking', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      await expect(service.findOne('user1', 'b1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns paginated results', async () => {
      prisma.booking.findMany.mockResolvedValue([{ id: 'b1' }]);
      prisma.booking.count.mockResolvedValue(1);

      const result = await service.findAll('user1', { page: 1, limit: 20 });
      expect(result.bookings).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });
});
