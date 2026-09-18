import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { IdempotencyService } from '../libs/idempotency/idempotency.service';
import { MoneyService } from '../libs/money/money.service';
import { TimeService } from '../libs/time/time.service';
import { Decimal } from '@prisma/client/runtime/library';
import { ConflictException } from '@nestjs/common';

describe('BookingService — Concurrency', () => {
  let service: BookingService;
  let prisma: any;
  let cache: any;
  let idempotency: any;
  let money: any;
  let time: any;

  const SLOT_ID = 'slot-concurrency-1';
  const BUSINESS_ID = 'biz-1';
  const DATE = '2026-09-20';
  const START_TIME = '10:00';

  beforeEach(async () => {
    prisma = {
      vehicle: { findFirst: jest.fn() },
      service: { findFirst: jest.fn() },
      business: { findFirst: jest.fn() },
      priceModifier: { findMany: jest.fn() },
      timeSlot: { findUnique: jest.fn(), update: jest.fn() },
      booking: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
      $queryRawUnsafe: jest.fn(),
    };
    cache = { invalidate: jest.fn() };
    idempotency = { check: jest.fn().mockResolvedValue(null), store: jest.fn() };
    money = {
      toCents: jest.fn((d: Decimal) => Math.round(Number(d) * 100)),
      toDecimal: jest.fn((c: number) => new Decimal(c / 100)),
      resolvePrice: jest.fn((base: number) => ({
        basePriceCents: base,
        multiplier: 1,
        unitPriceCents: base,
        totalPriceCents: base,
        currency: 'USD',
      })),
    };
    time = {
      isWithinWindow: jest.fn(() => true),
      isFreeCancel: jest.fn(() => true),
      toUTC: jest.fn(() => new Date()),
      addMinutes: jest.fn(() => new Date()),
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

    prisma.business.findFirst.mockResolvedValue({
      id: BUSINESS_ID, isVerified: true, isActive: true, timezone: 'UTC',
    });
    prisma.service.findFirst.mockResolvedValue({
      id: 'svc-1', basePrice: new Decimal(50), durationMinutes: 30, isActive: true,
    });
    prisma.vehicle.findFirst.mockResolvedValue({
      id: 'v1', type: 'SEDAN', size: 'COMPACT', customerId: 'user-1',
    });
    prisma.priceModifier.findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  function createDto(overrides?: Partial<{ userId: string; idempotencyKey: string }>) {
    return {
      userId: overrides?.userId ?? 'user-1',
      dto: {
        businessId: BUSINESS_ID,
        serviceId: 'svc-1',
        vehicleId: 'v1',
        date: DATE,
        startTime: START_TIME,
      },
      idempotencyKey: overrides?.idempotencyKey ?? `idem-${overrides?.userId ?? 'user-1'}`,
    };
  }

  function makeSlotRow(overrides?: Partial<{ currentBookings: number; maxBookings: number }>) {
    return {
      id: SLOT_ID,
      currentBookings: overrides?.currentBookings ?? 0,
      maxBookings: overrides?.maxBookings ?? 1,
      isAvailable: (overrides?.currentBookings ?? 0) < (overrides?.maxBookings ?? 1),
    };
  }

  function makeBooking() {
    return {
      id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'PENDING',
      totalPrice: new Decimal(50),
    };
  }

  describe('parallel bookings on same slot', () => {
    it('only one succeeds when maxBookings=1 and two requests arrive concurrently', async () => {
      let currentBookings = 0;

      prisma.$transaction.mockImplementation(async (fn: any) => {
        const snapshot = currentBookings;
        prisma.$queryRawUnsafe.mockResolvedValue([makeSlotRow({ currentBookings: snapshot, maxBookings: 1 })]);

        const booking = makeBooking();
        prisma.booking.create.mockImplementation(async () => {
          if (currentBookings >= 1) throw new ConflictException('SLOT_TAKEN');
          currentBookings++;
          return booking;
        });
        prisma.timeSlot.update.mockResolvedValue({});
        return fn(prisma);
      });

      const { dto } = createDto();
      const [r1, r2] = await Promise.allSettled([
        service.create('user-1', dto, 'race-A'),
        service.create('user-2', dto, 'race-B'),
      ]);

      const wins = [r1, r2].filter((r) => r.status === 'fulfilled');
      const losses = [r1, r2].filter((r) => r.status === 'rejected');

      expect(wins).toHaveLength(1);
      expect(losses).toHaveLength(1);
      if (losses[0].status === 'rejected') {
        expect(losses[0].reason).toBeInstanceOf(ConflictException);
      }
    });

    it('five concurrent requests on maxBookings=3 — exactly 3 succeed', async () => {
      let currentBookings = 0;

      prisma.$transaction.mockImplementation(async (fn: any) => {
        const snapshot = currentBookings;
        prisma.$queryRawUnsafe.mockResolvedValue([makeSlotRow({ currentBookings: snapshot, maxBookings: 3 })]);

        const booking = makeBooking();
        prisma.booking.create.mockImplementation(async () => {
          if (currentBookings >= 3) throw new ConflictException('SLOT_TAKEN');
          currentBookings++;
          return booking;
        });
        prisma.timeSlot.update.mockResolvedValue({});
        return fn(prisma);
      });

      const { dto } = createDto();
      const results = await Promise.allSettled([
        service.create('user-1', dto, 'five-A'),
        service.create('user-2', dto, 'five-B'),
        service.create('user-3', dto, 'five-C'),
        service.create('user-4', dto, 'five-D'),
        service.create('user-5', dto, 'five-E'),
      ]);

      const wins = results.filter((r) => r.status === 'fulfilled');
      const losses = results.filter((r) => r.status === 'rejected');

      expect(wins).toHaveLength(3);
      expect(losses).toHaveLength(2);
    });

    it('all requests fail when slot is already at maxBookings', async () => {
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.$queryRawUnsafe.mockResolvedValue([makeSlotRow({ currentBookings: 1, maxBookings: 1 })]);
        return fn(prisma);
      });

      const { dto } = createDto();
      const results = await Promise.allSettled([
        service.create('user-1', dto, 'full-A'),
        service.create('user-2', dto, 'full-B'),
      ]);

      const losses = results.filter((r) => r.status === 'rejected');
      expect(losses).toHaveLength(2);
      for (const loss of losses) {
        if (loss.status === 'rejected') {
          expect(loss.reason).toBeInstanceOf(ConflictException);
        }
      }
    });

    it('slot counter stays consistent across sequential bookings', async () => {
      let currentBookings = 0;

      prisma.$transaction.mockImplementation(async (fn: any) => {
        const snapshot = currentBookings;
        prisma.$queryRawUnsafe.mockResolvedValue([makeSlotRow({ currentBookings: snapshot, maxBookings: 2 })]);

        const booking = makeBooking();
        prisma.booking.create.mockImplementation(async () => {
          if (currentBookings >= 2) throw new ConflictException('SLOT_TAKEN');
          currentBookings++;
          return booking;
        });
        prisma.timeSlot.update.mockResolvedValue({});
        return fn(prisma);
      });

      const { dto } = createDto();

      const r1 = await service.create('user-1', dto, 'seq-1');
      expect(r1.bookingId).toBeDefined();

      const r2 = await service.create('user-2', dto, 'seq-2');
      expect(r2.bookingId).toBeDefined();

      await expect(service.create('user-3', dto, 'seq-3')).rejects.toThrow(ConflictException);
    });

    it('releases slot counter correctly after cancellation', async () => {
      let currentBookings = 1;

      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-active',
        customerId: 'user-1',
        status: 'PENDING',
        businessId: BUSINESS_ID,
        timeSlotId: SLOT_ID,
      });
      prisma.timeSlot.findUnique.mockResolvedValue({
        id: SLOT_ID,
        startTime: new Date(Date.now() + 48 * 3600000),
      });

      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.booking.update.mockResolvedValue({});
        prisma.timeSlot.update.mockImplementation(async (args: any) => {
          if (args.data?.currentBookings !== undefined) {
            const val = args.data.currentBookings;
            currentBookings = typeof val === 'object' && val.decrement !== undefined
              ? currentBookings - val.decrement
              : val;
          }
          return {};
        });
        return fn(prisma);
      });

      await service.cancel('user-1', 'booking-active');
      expect(currentBookings).toBe(0);

      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.$queryRawUnsafe.mockResolvedValue([makeSlotRow({ currentBookings: 0, maxBookings: 1 })]);
        const booking = makeBooking();
        prisma.booking.create.mockImplementation(async () => {
          if (currentBookings >= 1) throw new ConflictException('SLOT_TAKEN');
          currentBookings++;
          return booking;
        });
        prisma.timeSlot.update.mockResolvedValue({});
        return fn(prisma);
      });

      const { dto } = createDto();
      const result = await service.create('user-2', dto, 'after-cancel');
      expect(result.bookingId).toBeDefined();
    });
  });
});
