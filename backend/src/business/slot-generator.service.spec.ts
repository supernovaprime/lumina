import { Test, TestingModule } from '@nestjs/testing';
import { SlotGeneratorService } from './slot-generator.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';

describe('SlotGeneratorService', () => {
  let service: SlotGeneratorService;
  let prisma: any;
  let cache: any;
  const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

  function makeWeekly(daySlots: string[][]) {
    const week: Record<string, string[][]> = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
    week[todayKey] = daySlots;
    return week;
  }

  beforeEach(async () => {
    prisma = {
      availabilityTemplate: { findUnique: jest.fn() },
      timeSlot: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    cache = {
      invalidate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotGeneratorService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<SlotGeneratorService>(SlotGeneratorService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('generateSlots', () => {
    it('should generate slots for a simple 8-hour window', async () => {
      prisma.availabilityTemplate.findUnique.mockResolvedValue({
        businessId: 'b1',
        slotLengthMinutes: 30,
        bufferMinutes: 0,
        maxParallel: 1,
        weekly: makeWeekly([['09:00', '17:00']]),
        blackouts: [],
      });
      prisma.timeSlot.findUnique.mockResolvedValue(null);
      prisma.timeSlot.create.mockResolvedValue({});

      const result = await service.generateSlots('b1', 1) as any;

      expect(result.created).toBe(16);
      expect(prisma.timeSlot.create).toHaveBeenCalledTimes(16);
      expect(cache.invalidate).toHaveBeenCalledWith('slots:b1:*');
    });

    it('should skip blackout dates', async () => {
      const today = new Date().toISOString().split('T')[0];
      prisma.availabilityTemplate.findUnique.mockResolvedValue({
        businessId: 'b1',
        slotLengthMinutes: 30,
        bufferMinutes: 0,
        maxParallel: 1,
        weekly: makeWeekly([['09:00', '17:00']]),
        blackouts: [today],
      });

      const result = await service.generateSlots('b1', 1) as any;

      expect(result.created).toBe(0);
      expect(prisma.timeSlot.create).not.toHaveBeenCalled();
    });

    it('should not overwrite existing slots', async () => {
      prisma.availabilityTemplate.findUnique.mockResolvedValue({
        businessId: 'b1',
        slotLengthMinutes: 30,
        bufferMinutes: 0,
        maxParallel: 1,
        weekly: makeWeekly([['09:00', '12:00']]),
        blackouts: [],
      });
      prisma.timeSlot.findUnique.mockResolvedValue({ id: 'existing-slot' });

      const result = await service.generateSlots('b1', 1) as any;

      expect(result.created).toBe(0);
      expect(prisma.timeSlot.create).not.toHaveBeenCalled();
    });

    it('should handle buffer between slots', async () => {
      prisma.availabilityTemplate.findUnique.mockResolvedValue({
        businessId: 'b1',
        slotLengthMinutes: 30,
        bufferMinutes: 10,
        maxParallel: 2,
        weekly: makeWeekly([['09:00', '11:00']]),
        blackouts: [],
      });
      prisma.timeSlot.findUnique.mockResolvedValue(null);
      prisma.timeSlot.create.mockResolvedValue({});

      const result = await service.generateSlots('b1', 1) as any;

      expect(result.created).toBe(3);
      expect(prisma.timeSlot.create).toHaveBeenCalledTimes(3);
    });

    it('should return 0 if no template exists', async () => {
      prisma.availabilityTemplate.findUnique.mockResolvedValue(null);

      const result = await service.generateSlots('b1', 30);

      expect(result).toBeUndefined();
    });

    it('should handle multiple days', async () => {
      const allDays: Record<string, string[][]> = { mon: [['09:00', '12:00']], tue: [['09:00', '12:00']], wed: [['09:00', '12:00']], thu: [['09:00', '12:00']], fri: [['09:00', '12:00']], sat: [['09:00', '12:00']], sun: [['09:00', '12:00']] };
      prisma.availabilityTemplate.findUnique.mockResolvedValue({
        businessId: 'b1',
        slotLengthMinutes: 60,
        bufferMinutes: 0,
        maxParallel: 1,
        weekly: allDays,
        blackouts: [],
      });
      prisma.timeSlot.findUnique.mockResolvedValue(null);
      prisma.timeSlot.create.mockResolvedValue({});

      const result = await service.generateSlots('b1', 7) as any;

      expect(result.created).toBe(21);
    });
  });

  describe('generateSlotsFromWindow', () => {
    it('should split a window into slots', () => {
      const slots = service.generateSlotsFromWindow('09:00', '17:00', 30, 0, 1);
      expect(slots).toHaveLength(16);
      expect(slots[0]).toEqual({ startTime: '09:00', endTime: '09:30' });
      expect(slots[15]).toEqual({ startTime: '16:30', endTime: '17:00' });
    });

    it('should account for buffer', () => {
      const slots = service.generateSlotsFromWindow('09:00', '11:00', 30, 10, 1);
      expect(slots).toHaveLength(3);
      expect(slots[0]).toEqual({ startTime: '09:00', endTime: '09:30' });
      expect(slots[1]).toEqual({ startTime: '09:40', endTime: '10:10' });
      expect(slots[2]).toEqual({ startTime: '10:20', endTime: '10:50' });
    });

    it('should return empty array if slot length exceeds window', () => {
      const slots = service.generateSlotsFromWindow('09:00', '09:30', 60, 0, 1);
      expect(slots).toHaveLength(0);
    });
  });

  describe('time helpers', () => {
    it('timeToMinutes should parse HH:MM', () => {
      expect(service.timeToMinutes('09:00')).toBe(540);
      expect(service.timeToMinutes('17:30')).toBe(1050);
    });

    it('minutesToTime should format minutes as HH:MM', () => {
      expect(service.minutesToTime(540)).toBe('09:00');
      expect(service.minutesToTime(1050)).toBe('17:30');
      expect(service.minutesToTime(0)).toBe('00:00');
    });
  });
});
