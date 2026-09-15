import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { SlotGeneratorService } from './slot-generator.service';

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: any;
  let cache: any;
  let slotGenerator: any;

  beforeEach(async () => {
    prisma = {
      availabilityTemplate: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      timeSlot: { findMany: jest.fn() },
      service: { findUnique: jest.fn() },
      business: { findUnique: jest.fn() },
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      invalidate: jest.fn(),
    };

    slotGenerator = {
      generateSlots: jest.fn().mockResolvedValue({ created: 0, horizonDays: 30 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
        { provide: SlotGeneratorService, useValue: slotGenerator },
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
    it('should upsert template and trigger slot generation', async () => {
      prisma.availabilityTemplate.upsert.mockResolvedValue({
        businessId: 'b1',
        slotLengthMinutes: 30,
      });

      await service.updateTemplate('b1', {
        slotLengthMinutes: 30,
        bufferMinutes: 5,
        maxParallel: 3,
        weekly: { mon: [['09:00', '17:00']], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
        blackouts: [],
      });

      expect(prisma.availabilityTemplate.upsert).toHaveBeenCalled();
      expect(slotGenerator.generateSlots).toHaveBeenCalledWith('b1', 30);
    });

    it('should throw BadRequestException if slot length exceeds window', async () => {
      await expect(service.updateTemplate('b1', {
        slotLengthMinutes: 120,
        bufferMinutes: 0,
        maxParallel: 1,
        weekly: { mon: [['09:00', '10:00']], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
        blackouts: [],
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if start >= end', async () => {
      await expect(service.updateTemplate('b1', {
        slotLengthMinutes: 30,
        bufferMinutes: 0,
        maxParallel: 1,
        weekly: { mon: [['17:00', '09:00']], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
        blackouts: [],
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSlots', () => {
    it('should return cached slots if available', async () => {
      const date = futureDate(5);
      const cached = { date, businessId: 'b1', slots: [] };
      cache.get.mockResolvedValue(cached);
      prisma.business.findUnique.mockResolvedValue({ isVerified: true, isActive: true });

      const result = await service.getSlots('b1', date);
      expect(result).toEqual(cached);
    });

    it('should throw BadRequestException for invalid date', async () => {
      await expect(service.getSlots('b1', 'not-a-date')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for date outside 30-day range', async () => {
      const date = futureDate(35);
      await expect(service.getSlots('b1', date)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if business is not verified', async () => {
      prisma.business.findUnique.mockResolvedValue({ isVerified: false, isActive: true });
      const date = futureDate(5);

      await expect(service.getSlots('b1', date)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if business is not active', async () => {
      prisma.business.findUnique.mockResolvedValue({ isVerified: true, isActive: false });
      const date = futureDate(5);

      await expect(service.getSlots('b1', date)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if business not found', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      const date = futureDate(5);

      await expect(service.getSlots('b1', date)).rejects.toThrow(NotFoundException);
    });

    it('should query slots and cache result', async () => {
      const date = futureDate(5);
      prisma.business.findUnique.mockResolvedValue({ isVerified: true, isActive: true });
      prisma.timeSlot.findMany.mockResolvedValue([
        { id: 't1', startTime: '09:00', endTime: '09:30', maxBookings: 3, currentBookings: 1, isAvailable: true },
        { id: 't2', startTime: '09:30', endTime: '10:00', maxBookings: 3, currentBookings: 3, isAvailable: true },
      ]);

      const result = await service.getSlots('b1', date) as any;

      expect(result.slots).toHaveLength(2);
      expect(result.slots[0].remaining).toBe(2);
      expect(result.slots[0].isAvailable).toBe(true);
      expect(result.slots[1].remaining).toBe(0);
      expect(result.slots[1].isAvailable).toBe(false);
      expect(cache.set).toHaveBeenCalled();
    });

    it('should filter slots by service duration', async () => {
      const date = futureDate(5);
      prisma.business.findUnique.mockResolvedValue({ isVerified: true, isActive: true });
      prisma.timeSlot.findMany.mockResolvedValue([
        { id: 't1', startTime: '09:00', endTime: '09:30', maxBookings: 3, currentBookings: 0, isAvailable: true },
        { id: 't2', startTime: '09:30', endTime: '10:30', maxBookings: 3, currentBookings: 0, isAvailable: true },
      ]);
      prisma.service.findUnique.mockResolvedValue({ id: 's1', durationMinutes: 45 });

      const result = await service.getSlots('b1', date, 's1') as any;

      expect(result.slots).toHaveLength(1);
      expect(result.slots[0].id).toBe('t2');
    });
  });
});
