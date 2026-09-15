import { Test, TestingModule } from '@nestjs/testing';
import { TimeService } from './time.service';

describe('TimeService', () => {
  let service: TimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimeService],
    }).compile();

    service = module.get<TimeService>(TimeService);
  });

  describe('toUTC', () => {
    it('converts local date+time to UTC', () => {
      const result = service.toUTC('2026-09-15', '09:00', 'America/New_York');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('toLocalDate', () => {
    it('converts UTC to local date string', () => {
      const date = new Date('2026-09-15T14:00:00Z');
      const result = service.toLocalDate(date, 'UTC');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('toLocalTime', () => {
    it('converts UTC to local time string', () => {
      const date = new Date('2026-09-15T14:00:00Z');
      const result = service.toLocalTime(date, 'UTC');
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('isFreeCancel', () => {
    it('returns true when >24h before start', () => {
      const future = new Date(Date.now() + 48 * 60 * 60 * 1000);
      expect(service.isFreeCancel(future)).toBe(true);
    });

    it('returns false when <24h before start', () => {
      const soon = new Date(Date.now() + 12 * 60 * 60 * 1000);
      expect(service.isFreeCancel(soon)).toBe(false);
    });

    it('uses custom threshold', () => {
      const in10h = new Date(Date.now() + 10 * 60 * 60 * 1000);
      // 10h > 8h threshold → free cancel
      expect(service.isFreeCancel(in10h, 8)).toBe(true);
      // 10h < 12h threshold → not free cancel
      expect(service.isFreeCancel(in10h, 12)).toBe(false);
    });
  });

  describe('isWithinWindow', () => {
    it('returns true for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(service.isWithinWindow(today, 30)).toBe(true);
    });

    it('returns true for future date within range', () => {
      const future = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const dateStr = future.toISOString().split('T')[0];
      expect(service.isWithinWindow(dateStr, 30)).toBe(true);
    });

    it('returns false for past date', () => {
      expect(service.isWithinWindow('2020-01-01', 30)).toBe(false);
    });

    it('returns false for date beyond range', () => {
      const farFuture = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const dateStr = farFuture.toISOString().split('T')[0];
      expect(service.isWithinWindow(dateStr, 30)).toBe(false);
    });
  });

  describe('getDayKey', () => {
    it('returns correct day abbreviation', () => {
      const sunday = new Date('2026-09-13');
      expect(service.getDayKey(sunday)).toBe('sun');
      const monday = new Date('2026-09-14');
      expect(service.getDayKey(monday)).toBe('mon');
    });
  });

  describe('today', () => {
    it('returns YYYY-MM-DD format', () => {
      const result = service.today();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('addMinutes', () => {
    it('adds minutes to date', () => {
      const date = new Date('2026-09-15T10:00:00Z');
      const result = service.addMinutes(date, 30);
      expect(result.getMinutes()).toBe(30);
    });
  });

  describe('formatISO', () => {
    it('returns ISO string', () => {
      const date = new Date('2026-09-15T10:00:00Z');
      const result = service.formatISO(date);
      expect(result).toBe('2026-09-15T10:00:00.000Z');
    });
  });
});
