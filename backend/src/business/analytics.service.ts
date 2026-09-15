import { Injectable } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { startOfDay, endOfDay, startOfMonth, subDays, format } from 'date-fns';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getAnalytics(businessId: string) {
    const cacheKey = `analytics:${businessId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const now = new Date();

    const [
      bookingsToday,
      revenueResult,
      upcomingBookings,
      completedBookings,
      totalBookings,
      business,
    ] = await Promise.all([
      this.prisma.booking.count({
        where: {
          businessId,
          createdAt: { gte: startOfDay(now), lte: endOfDay(now) },
        },
      }),

      this.prisma.payment.aggregate({
        where: {
          booking: { businessId },
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth(now), lte: endOfDay(now) },
        },
        _sum: { amount: true },
      }),

      this.prisma.booking.count({
        where: {
          businessId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          date: { gte: now },
        },
      }),

      this.prisma.booking.count({
        where: {
          businessId,
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth(now), lte: endOfDay(now) },
        },
      }),

      this.prisma.booking.count({
        where: {
          businessId,
          createdAt: { gte: startOfMonth(now), lte: endOfDay(now) },
        },
      }),

      this.prisma.business.findUnique({
        where: { id: businessId },
        select: { rating: true, reviewCount: true },
      }),
    ]);

    const completionRate = totalBookings > 0
      ? Math.round((completedBookings / totalBookings) * 100) / 100
      : 0;

    const analytics = {
      bookingsToday,
      revenueMTD: revenueResult._sum.amount || 0,
      revenueMTDCurrency: 'USD',
      averageRating: business?.rating || 0,
      totalReviews: business?.reviewCount || 0,
      upcomingBookings,
      completionRate,
      bookingsTrend: await this.getBookingsTrend(businessId, 7),
    };

    await this.cache.set(cacheKey, analytics, 60);
    return analytics;
  }

  private async getBookingsTrend(businessId: string, days: number) {
    const results = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const count = await this.prisma.booking.count({
        where: {
          businessId,
          createdAt: { gte: startOfDay(date), lte: endOfDay(date) },
        },
      });
      results.push({
        date: format(date, 'yyyy-MM-dd'),
        count,
      });
    }
    return results;
  }
}
