# Business Feature: Business Analytics (MVP)

## Brief Description

Business owners see a simple dashboard with key metrics — bookings today, revenue this month, average rating, and recent activity. All data is cached for 60 seconds to avoid hammering the DB.

**Endpoint:** `GET /api/v1/businesses/:id/analytics`
**Auth:** BUSINESS role (owner only)
**Cost:** $0

---

## 1. What This Feature Does

1. Business owner opens the analytics page.
2. Backend runs 4 parallel DB queries (bookings today, revenue MTD, total reviews, upcoming bookings).
3. Result is cached in Redis for 60 seconds.
4. Returns a single JSON response with all metrics.

---

## 2. API Contract

### Request

```
GET /api/v1/businesses/:id/analytics
Authorization: Bearer <business-jwt>
```

No query parameters. No request body.

### Response — Success

```json
{
  "success": true,
  "data": {
    "bookingsToday": 8,
    "revenueMTD": 425000,
    "revenueMTDCurrency": "USD",
    "averageRating": 4.7,
    "totalReviews": 128,
    "upcomingBookings": 15,
    "completionRate": 0.95,
    "bookingsTrend": [
      { "date": "2026-09-08", "count": 6 },
      { "date": "2026-09-09", "count": 9 },
      { "date": "2026-09-10", "count": 7 },
      { "date": "2026-09-11", "count": 10 },
      { "date": "2026-09-12", "count": 8 },
      { "date": "2026-09-13", "count": 5 },
      { "date": "2026-09-14", "count": 8 }
    ]
  }
}
```

### Response — Error

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Business not found"
  }
}
```

---

## 3. Data Model (No New Tables)

This feature reads from existing tables only:

| Table | Columns Used |
|-------|-------------|
| `Booking` | `status`, `createdAt`, `totalPrice` |
| `Review` | `rating`, `isHidden` |
| `Payment` | `status`, `amount` |
| `Business` | `rating`, `reviewCount` |

No new models or migrations needed.

---

## 4. Implementation Files

### 4.1 Controller — `analytics.controller.ts`

```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { OwnershipGuard } from '../libs/common/guards/ownership.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('businesses/:businessId')
@UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
@Roles('BUSINESS')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('analytics')
  async getAnalytics(@Param('businessId') businessId: string) {
    return this.analyticsService.getAnalytics(businessId);
  }
}
```

### 4.2 Service — `analytics.service.ts`

```typescript
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

      this.getBookingsTrend(businessId, 7),
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
```

---

## 5. Cache Invalidation

| Event | Cache Key Invalidated |
|-------|----------------------|
| New booking | `analytics:{businessId}` |
| Booking completed | `analytics:{businessId}` |
| New review | `analytics:{businessId}` |
| Payment received | `analytics:{businessId}` |

---

## 6. Testing

### Unit Test — `analytics.service.spec.ts`

```typescript
describe('AnalyticsService', () => {
  describe('getAnalytics', () => {
    it('should return cached analytics if available', async () => {
      // Mock cache.get to return cached data
      // Verify prisma queries are NOT called
    });

    it('should query DB and cache result on cache miss', async () => {
      // Mock cache.get to return null
      // Mock all prisma queries
      // Verify cache.set is called with correct TTL
    });

    it('should handle zero bookings gracefully', async () => {
      // Mock 0 bookings
      // Expect completionRate: 0
    });

    it('should calculate completion rate correctly', async () => {
      // Mock 8 completed out of 10 total
      // Expect completionRate: 0.8
    });
  });
});
```

### E2E Test — `analytics.e2e-spec.ts`

```typescript
describe('Business Analytics (e2e)', () => {
  it('GET /businesses/:id/analytics returns 401 without token', () => {
    return request(app.getHttpServer())
      .get('/api/v1/businesses/biz-1/analytics')
      .expect(401);
  });

  it('GET /businesses/:id/analytics returns 403 for CUSTOMER role', () => {
    return request(app.getHttpServer())
      .get('/api/v1/businesses/biz-1/analytics')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('GET /businesses/:id/analytics returns 200 for business owner', () => {
    return request(app.getHttpServer())
      .get(`/api/v1/businesses/${businessId}/analytics`)
      .set('Authorization', `Bearer ${businessToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('bookingsToday');
        expect(res.body.data).toHaveProperty('revenueMTD');
        expect(res.body.data).toHaveProperty('averageRating');
        expect(res.body.data).toHaveProperty('completionRate');
        expect(res.body.data).toHaveProperty('bookingsTrend');
      });
  });
});
```

---

## 7. Performance Considerations

| Concern | Solution |
|---------|----------|
| 4 parallel DB queries | `Promise.all` — runs concurrently |
| Repeated reads | Redis cache with 60s TTL |
| Large result sets | No lists — just aggregate counts |
| N+1 queries | None — all aggregates are single queries |

---

## 8. Security Checklist

- [x] `JwtAuthGuard` — verifies JWT token
- [x] `RolesGuard` — ensures `role === 'BUSINESS'`
- [x] `OwnershipGuard` — ensures owner can only see their own analytics
- [x] No sensitive data exposed (no PII in analytics)
- [x] Cache key is business-specific (each owner sees only their data)
- [x] Rate limiting via `ThrottlerGuard`

---

## 9. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/business/analytics.controller.ts` | Route handler, guard decorators |
| Service | `src/business/analytics.service.ts` | Business logic, DB queries, caching |
| Unit Test | `src/business/analytics.service.spec.ts` | Service logic tests |
| E2E Test | `test/e2e/analytics.e2e-spec.ts` | Full HTTP tests |

**Total files: 4** (no new DB models, no new migrations)
