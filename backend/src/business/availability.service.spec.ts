import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: any;
  let cache: any;

  beforeEach(async () => {
    prisma = {
      availabilityTemplate: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      timeSlot: { findMany: jest.fn() },
      service: { findUnique: jest.fn() },
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      invalidate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getTemplate', () => {
    it('should return template', async () => {
      prisma.availabilityTemplate.findUnique.mockResolvedValue({
        businessId: 'b1',
        slotLengthMinutes: 30,
      });

      const result = await service.getTemplate('b1');
      expect(result.slotLengthMinutes).toBe(30);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.availabilityTemplate.findUnique.mockResolvedValue(null);
      await expect(service.getTemplate('b1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTemplate', () => {
    it('should upsert template and invalidate cache', async () => {
      prisma.availabilityTemplate.upsert.mockResolvedValue({
        businessId: 'b1',
        slotLengthMinutes: 30,
      });

      await service.updateTemplate('b1', {
        slotLengthMinutes: 30,
        bufferMinutes: 5,
        maxParallel: 3,
        weekly: {},
        blackouts: [],
      });

      expect(prisma.availabilityTemplate.upsert).toHaveBeenCalled();
      expect(cache.invalidate).toHaveBeenCalledWith('slots:b1:*');
    });
  });

  describe('getSlots', () => {
    it('should return cached slots if available', async () => {
      const cached = { date: '2026-01-15', businessId: 'b1', slots: [] };
      cache.get.mockResolvedValue(cached);

      const result = await service.getSlots('b1', '2026-01-15');
      expect(result).toEqual(cached);
    });

    it('should throw BadRequestException for invalid date', async () => {
      await expect(service.getSlots('b1', 'not-a-date')).rejects.toThrow(BadRequestException);
    });

    it('should query slots and cache result', async () => {
      prisma.timeSlot.findMany.mockResolvedValue([
        { id: 't1', startTime: '09:00', endTime: '09:30', maxBookings: 3, currentBookings: 1, isAvailable: true },
        { id: 't2', startTime: '09:30', endTime: '10:00', maxBookings: 3, currentBookings: 3, isAvailable: true },
      ]);

      const result = await service.getSlots('b1', '2026-01-15') as any;

      expect(result.slots).toHaveLength(2);
      expect(result.slots[0].remaining).toBe(2);
      expect(result.slots[0].isAvailable).toBe(true);
      expect(result.slots[1].remaining).toBe(0);
      expect(result.slots[1].isAvailable).toBe(false);
      expect(cache.set).toHaveBeenCalled();
    });

    it('should filter slots by service duration', async () => {
      prisma.timeSlot.findMany.mockResolvedValue([
        { id: 't1', startTime: '09:00', endTime: '09:30', maxBookings: 3, currentBookings: 0, isAvailable: true },
        { id: 't2', startTime: '09:30', endTime: '10:30', maxBookings: 3, currentBookings: 0, isAvailable: true },
      ]);
      prisma.service.findUnique.mockResolvedValue({ id: 's1', durationMinutes: 45 });

      const result = await service.getSlots('b1', '2026-01-15', 's1') as any;

      expect(result.slots).toHaveLength(1);
      expect(result.slots[0].id).toBe('t2');
    });
  });
});
