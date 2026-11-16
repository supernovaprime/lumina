import { Injectable } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { startOfDay, endOfDay, startOfMonth, subDays } from 'date-fns';

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

    // The dashboard used to fire five counts, a payment aggregate, a business
    // lookup, and seven trend counts concurrently. That burst exhausted the
    // Supabase pooler. Conditional aggregates collapse the snapshot into one
    // round trip; the trend uses a single generate_series query.
    const rows = await this.prisma.$queryRaw<
      Array<{
        bookingsToday: number;
        revenueMTD: number;
        upcomingBookings: number;
        completedBookings: number;
        totalBookings: number;
        averageRating: number;
        totalReviews: number;
      }>
    >`
      SELECT
        (SELECT COUNT(*)::int
           FROM "Booking"
          WHERE "businessId" = ${businessId}
            AND "createdAt" >= ${startOfDay(now)}
            AND "createdAt" <= ${endOfDay(now)}) AS "bookingsToday",
        (SELECT COALESCE(SUM(p."amount"), 0)::float8
           FROM "Payment" p
           JOIN "Booking" b ON b."id" = p."bookingId"
          WHERE b."businessId" = ${businessId}
            AND p."status" = 'COMPLETED'
            AND p."createdAt" >= ${startOfMonth(now)}
            AND p."createdAt" <= ${endOfDay(now)}) AS "revenueMTD",
        (SELECT COUNT(*)::int
           FROM "Booking"
          WHERE "businessId" = ${businessId}
            AND "status" IN ('PENDING', 'CONFIRMED')
            AND "date" >= ${now}) AS "upcomingBookings",
        (SELECT COUNT(*)::int
           FROM "Booking"
          WHERE "businessId" = ${businessId}
            AND "status" = 'COMPLETED'
            AND "createdAt" >= ${startOfMonth(now)}
            AND "createdAt" <= ${endOfDay(now)}) AS "completedBookings",
        (SELECT COUNT(*)::int
           FROM "Booking"
          WHERE "businessId" = ${businessId}
            AND "createdAt" >= ${startOfMonth(now)}
            AND "createdAt" <= ${endOfDay(now)}) AS "totalBookings",
        (SELECT COALESCE("rating", 0)::float8
           FROM "Business"
          WHERE "id" = ${businessId}) AS "averageRating",
        (SELECT COALESCE("reviewCount", 0)::int
           FROM "Business"
          WHERE "id" = ${businessId}) AS "totalReviews"
    `;

    const row = rows[0];
    const totalBookings = Number(row?.totalBookings ?? 0);
    const completedBookings = Number(row?.completedBookings ?? 0);
    const completionRate =
      totalBookings > 0
        ? Math.round((completedBookings / totalBookings) * 100) / 100
        : 0;

    const analytics = {
      bookingsToday: Number(row?.bookingsToday ?? 0),
      revenueMTD: Number(row?.revenueMTD ?? 0),
      revenueMTDCurrency: 'USD',
      averageRating: Number(row?.averageRating ?? 0),
      totalReviews: Number(row?.totalReviews ?? 0),
      upcomingBookings: Number(row?.upcomingBookings ?? 0),
      completionRate,
      bookingsTrend: await this.getBookingsTrend(businessId, 7),
    };

    await this.cache.set(cacheKey, analytics, 60);
    return analytics;
  }

  private async getBookingsTrend(businessId: string, days: number) {
    const now = new Date();
    const start = startOfDay(subDays(now, days - 1));
    const end = endOfDay(now);

    const rows = await this.prisma.$queryRaw<
      Array<{ date: string; count: number }>
    >`
      SELECT
        to_char(d.day, 'YYYY-MM-DD') AS "date",
        COUNT(b."id")::int AS "count"
      FROM generate_series(${start}::date, ${end}::date, interval '1 day') AS d(day)
      LEFT JOIN "Booking" b
        ON b."businessId" = ${businessId}
       AND b."createdAt" >= d.day
       AND b."createdAt" < d.day + interval '1 day'
      GROUP BY d.day
      ORDER BY d.day
    `;

    return rows.map((entry) => ({
      date: entry.date,
      count: Number(entry.count),
    }));
  }
}
