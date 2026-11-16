import { Test, TestingModule } from '@nestjs/testing';
import { SlotReconcilerService } from './slot-reconciler.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';

describe('SlotReconcilerService', () => {
  let service: SlotReconcilerService;
  let prisma: any;
  let cache: any;

  beforeEach(async () => {
    prisma = {
      availabilityTemplate: { findUnique: jest.fn() },
      timeSlot: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    cache = {
      invalidate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotReconcilerService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<SlotReconcilerService>(SlotReconcilerService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('reconcileFutureSlots', () => {
    it('should delete empty slots outside new hours', async () => {
      prisma.availabilityTemplate.findUnique.mockResolvedValue({
        businessId: 'b1',
        slotLengthMinutes: 30,
        bufferMinutes: 0,
        maxParallel: 1,
        weekly: {
          mon: [['10:00', '14:00']],
          tue: [],
          wed: [],
          thu: [],
          fri: [],
          sat: [],
          sun: [],
        },
        blackouts: [],
      });
      prisma.timeSlot.findMany.mockResolvedValue([
        { id: 's1', date: new Date(), startTime: '09:00', currentBookings: 0 },
        { id: 's2', date: new Date(), startTime: '10:00', currentBookings: 0 },
      ]);
      prisma.timeSlot.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.reconcileFutureSlots('b1');

      expect(result.deleted).toBeGreaterThanOrEqual(1);
      expect(prisma.timeSlot.deleteMany).toHaveBeenCalled();
    });

    it('should keep slots with bookings (orphaned)', async () => {
      prisma.availabilityTemplate.findUnique.mockResolvedValue({
        businessId: 'b1',
        slotLengthMinutes: 30,
        bufferMinutes: 0,
        maxParallel: 1,
        weekly: {
          mon: [['10:00', '14:00']],
          tue: [],
          wed: [],
          thu: [],
          fri: [],
          sat: [],
          sun: [],
        },
        blackouts: [],
      });
      prisma.timeSlot.findMany.mockResolvedValue([
        { id: 's1', date: new Date(), startTime: '09:00', currentBookings: 2 },
      ]);

      const result = await service.reconcileFutureSlots('b1');

      expect(result.orphaned).toBeGreaterThanOrEqual(1);
      expect(prisma.timeSlot.deleteMany).not.toHaveBeenCalled();
    });

    it('should return 0 if no template exists', async () => {
      prisma.availabilityTemplate.findUnique.mockResolvedValue(null);

      const result = await service.reconcileFutureSlots('b1');

      expect(result).toEqual({ deleted: 0, orphaned: 0 });
    });

    it('should invalidate cache after reconciliation', async () => {
      prisma.availabilityTemplate.findUnique.mockResolvedValue({
        businessId: 'b1',
        slotLengthMinutes: 30,
        bufferMinutes: 0,
        maxParallel: 1,
        weekly: {
          mon: [],
          tue: [],
          wed: [],
          thu: [],
          fri: [],
          sat: [],
          sun: [],
        },
        blackouts: [],
      });
      prisma.timeSlot.findMany.mockResolvedValue([]);

      await service.reconcileFutureSlots('b1');

      expect(cache.invalidate).toHaveBeenCalledWith('slots:b1:*');
    });

    it('should handle blackouts by clearing all slots for that day', async () => {
      const today = new Date().toISOString().split('T')[0];
      prisma.availabilityTemplate.findUnique.mockResolvedValue({
        businessId: 'b1',
        slotLengthMinutes: 30,
        bufferMinutes: 0,
        maxParallel: 1,
        weekly: {
          mon: [['09:00', '17:00']],
          tue: [],
          wed: [],
          thu: [],
          fri: [],
          sat: [],
          sun: [],
        },
        blackouts: [today],
      });
      prisma.timeSlot.findMany.mockResolvedValue([
        { id: 's1', date: new Date(), startTime: '09:00', currentBookings: 0 },
      ]);
      prisma.timeSlot.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.reconcileFutureSlots('b1');

      expect(result.deleted).toBeGreaterThanOrEqual(1);
    });
  });
});
