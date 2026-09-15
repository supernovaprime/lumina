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
      booking: { count: jest.fn() },
      payment: { aggregate: jest.fn() },
      business: { findUnique: jest.fn() },
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
      prisma.booking.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(12)
        .mockResolvedValue(7);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 500000 } });
      prisma.business.findUnique.mockResolvedValue({ rating: 4.5, reviewCount: 20 });

      const result = await service.getAnalytics('b1') as any;

      expect(result.bookingsToday).toBe(3);
      expect(result.revenueMTD).toBe(500000);
      expect(result.averageRating).toBe(4.5);
      expect(result.totalReviews).toBe(20);
      expect(result.upcomingBookings).toBe(10);
      expect(result.completionRate).toBeGreaterThan(0);
      expect(cache.set).toHaveBeenCalled();
    });

    it('should handle zero revenue', async () => {
      prisma.booking.count.mockResolvedValue(0);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.business.findUnique.mockResolvedValue(null);

      const result = await service.getAnalytics('b1') as any;

      expect(result.revenueMTD).toBe(0);
      expect(result.averageRating).toBe(0);
      expect(result.totalReviews).toBe(0);
    });

    it('should call 5 booking count queries', async () => {
      prisma.booking.count.mockResolvedValue(0);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      prisma.business.findUnique.mockResolvedValue({ rating: 0, reviewCount: 0 });

      await service.getAnalytics('b1');

      expect(prisma.booking.count).toHaveBeenCalledTimes(4 + 7);
    });
  });
});
