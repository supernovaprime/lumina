import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: any;
  let cache: any;

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getAnalytics', () => {
    it('should return cached analytics if available', async () => {
      const cached = { bookingsToday: 5, revenueMTD: 100000 };
      cache.get.mockResolvedValue(cached);

      const result = await service.getAnalytics('b1');
      expect(result).toEqual(cached);
    });

    it('should compute analytics on cache miss', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([
          {
            bookingsToday: 3,
            revenueMTD: 500000,
            upcomingBookings: 10,
            completedBookings: 5,
            totalBookings: 10,
            averageRating: 4.5,
            totalReviews: 20,
          },
        ])
        .mockResolvedValueOnce([{ date: '2026-11-16', count: 1 }]);

      const result = (await service.getAnalytics('b1')) as any;

      expect(result.bookingsToday).toBe(3);
      expect(result.revenueMTD).toBe(500000);
      expect(result.averageRating).toBe(4.5);
      expect(result.totalReviews).toBe(20);
      expect(result.upcomingBookings).toBe(10);
      expect(result.completionRate).toBeGreaterThan(0);
      expect(cache.set).toHaveBeenCalled();
    });

    it('should handle zero revenue', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([
          {
            bookingsToday: 0,
            revenueMTD: 0,
            upcomingBookings: 0,
            completedBookings: 0,
            totalBookings: 0,
            averageRating: 0,
            totalReviews: 0,
          },
        ])
        .mockResolvedValueOnce([]);

      const result = (await service.getAnalytics('b1')) as any;

      expect(result.revenueMTD).toBe(0);
      expect(result.averageRating).toBe(0);
      expect(result.totalReviews).toBe(0);
    });

    it('should use two raw queries instead of a query burst', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([
          {
            bookingsToday: 0,
            revenueMTD: 0,
            upcomingBookings: 0,
            completedBookings: 0,
            totalBookings: 0,
            averageRating: 0,
            totalReviews: 0,
          },
        ])
        .mockResolvedValueOnce([]);

      await service.getAnalytics('b1');

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });
});
