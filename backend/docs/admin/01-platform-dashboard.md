# Admin Feature: Platform Dashboard

## Brief Description

The Platform Dashboard is the admin's landing page after login. It displays real-time aggregated metrics about the entire CarWash platform: bookings today, revenue this month, active businesses, pending verifications, and refund rate. It gives admins a high-level snapshot of platform health without needing to dig into reports.

**Endpoint:** `GET /api/v1/admin/dashboard`  
**Auth:** ADMIN only  
**Cost:** $0 (all free-tier services)

---

## 1. What This Feature Does

When an admin opens the dashboard, the backend:

1. Receives `GET /admin/dashboard` with a valid ADMIN JWT.
2. Runs 5 parallel database queries (bookings today, revenue MTD, active businesses, pending verifications, refund count).
3. Caches the result in Redis for 60 seconds (avoids hammering the DB on every page load).
4. Returns a single JSON response with all metrics.

---

## 2. API Contract

### Request

```
GET /api/v1/admin/dashboard
Authorization: Bearer <admin-jwt>
```

No query parameters. No request body.

### Response — Success

```json
{
  "success": true,
  "data": {
    "bookingsToday": 42,
    "revenueMTD": 1250000,
    "revenueMTDCurrency": "USD",
    "activeBusinesses": 87,
    "pendingVerifications": 5,
    "totalUsers": 3240,
    "refundRate": 0.02,
    "bookingsTrend": [
      { "date": "2026-09-08", "count": 38 },
      { "date": "2026-09-09", "count": 41 },
      { "date": "2026-09-10", "count": 35 },
      { "date": "2026-09-11", "count": 44 },
      { "date": "2026-09-12", "count": 42 },
      { "date": "2026-09-13", "count": 39 },
      { "date": "2026-09-14", "count": 42 }
    ]
  }
}
```

### Response — Error

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Admin access required"
  }
}
```

---

## 3. Data Model (No New Tables)

This feature reads from existing tables only:

| Table | Columns Used |
|-------|-------------|
| `Booking` | `status`, `createdAt`, `totalPrice` |
| `Business` | `isActive`, `isVerified`, `verificationStatus` |
| `User` | `id`, `isActive` |
| `Payment` | `status`, `amount` |

No new models or migrations needed.

---

## 4. Implementation Files

### 4.1 Controller — `admin.controller.ts`

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardMetrics();
  }
}
```

**Why this structure:**
- `@UseGuards` ensures only authenticated users reach this controller.
- `@Roles('ADMIN')` ensures only admins can access.
- Controller does nothing except call the service — no business logic here.

### 4.2 Service — `admin.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { startOfMonth, endOfDay, subDays, format } from 'date-fns';

@Injectable()
export class AdminService {
  private readonly CACHE_KEY = 'admin:dashboard';
  private readonly CACHE_TTL = 60; // seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getDashboardMetrics() {
    // 1. Check cache first
    const cached = await this.cache.get(this.CACHE_KEY);
    if (cached) return cached;

    // 2. Run all queries in parallel (non-blocking)
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfDay(now);

    const [
      bookingsToday,
      revenueResult,
      activeBusinesses,
      pendingVerifications,
      totalUsers,
      refundResult,
      bookingsTrend,
    ] = await Promise.all([
      // Bookings created today
      this.prisma.booking.count({
        where: {
          createdAt: { gte: startOfDay(now), lte: endOfDay(now) },
        },
      }),

      // Revenue this month (sum of completed payments)
      this.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),

      // Active + verified businesses
      this.prisma.business.count({
        where: { isActive: true, isVerified: true },
      }),

      // Businesses pending verification
      this.prisma.business.count({
        where: { verificationStatus: 'PENDING' },
      }),

      // Total active users
      this.prisma.user.count({
        where: { isActive: true },
      }),

      // Refund rate (refunds / total payments this month)
      this.prisma.payment.aggregate({
        where: {
          status: 'REFUNDED',
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        _count: true,
      }),

      // Last 7 days bookings trend
      this.getBookingsTrend(7),
    ]);

    // 3. Calculate refund rate
    const totalPaymentsThisMonth = await this.prisma.payment.count({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
    });
    const refundRate = totalPaymentsThisMonth > 0
      ? refundResult._count / totalPaymentsThisMonth
      : 0;

    // 4. Build response
    const metrics = {
      bookingsToday,
      revenueMTD: revenueResult._sum.amount || 0,
      revenueMTDCurrency: 'USD',
      activeBusinesses,
      pendingVerifications,
      totalUsers,
      refundRate: Math.round(refundRate * 100) / 100,
      bookingsTrend,
    };

    // 5. Cache for 60 seconds
    await this.cache.set(this.CACHE_KEY, metrics, this.CACHE_TTL);

    return metrics;
  }

  private async getBookingsTrend(days: number) {
    const results = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const count = await this.prisma.booking.count({
        where: {
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

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
```

**Why this structure:**
- `Promise.all` runs all 5 queries in parallel — no waterfalls.
- Cache check happens first — if cached, returns instantly.
- No business logic in controller — all here in service.
- Pure functions for date math — no external date library needed for MVP.

### 4.3 Module — `admin.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { CacheModule } from '../libs/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
```

### 4.4 DTO — No DTO needed

This is a `GET` endpoint with no request body or query parameters. No validation pipe needed.

### 4.5 Cache Service — `cache.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

**Cost note:** Uses Upstash Redis free tier (10K commands/day). Dashboard queries are cached 60s, so even 100 page loads/day = ~100 commands. Well within limits.

---

## 5. Cache Invalidation

The dashboard cache is invalidated when:

| Event | How |
|-------|-----|
| New booking created | `booking.service.ts` calls `cache.invalidate('admin:dashboard')` |
| Booking cancelled | `booking.service.ts` calls `cache.invalidate('admin:dashboard')` |
| Business verified | `admin.service.ts` calls `cache.invalidate('admin:dashboard')` |
| Payment completed | `payment.service.ts` calls `cache.invalidate('admin:dashboard')` |

---

## 6. Testing

### Unit Test — `admin.service.spec.ts`

```typescript
describe('AdminService', () => {
  describe('getDashboardMetrics', () => {
    it('should return cached metrics if available', async () => {
      // Mock cache.get to return cached data
      // Verify prisma queries are NOT called
    });

    it('should query DB and cache result on cache miss', async () => {
      // Mock cache.get to return null
      // Mock all prisma queries
      // Verify cache.set is called with correct TTL
    });

    it('should calculate refund rate correctly', async () => {
      // Mock 2 refunds out of 100 payments
      // Expect refundRate: 0.02
    });

    it('should handle zero payments gracefully', async () => {
      // Mock 0 total payments
      // Expect refundRate: 0 (not NaN or Infinity)
    });
  });
});
```

### Integration Test — `admin.e2e-spec.ts`

```typescript
describe('Admin Dashboard (e2e)', () => {
  it('GET /admin/dashboard returns 401 without token', () => {
    return request(app.getHttpServer())
      .get('/admin/dashboard')
      .expect(401);
  });

  it('GET /admin/dashboard returns 403 for CUSTOMER role', () => {
    return request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('GET /admin/dashboard returns 200 for ADMIN role', () => {
    return request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('bookingsToday');
        expect(res.body.data).toHaveProperty('revenueMTD');
        expect(res.body.data).toHaveProperty('activeBusinesses');
        expect(res.body.data).toHaveProperty('pendingVerifications');
        expect(res.body.data).toHaveProperty('refundRate');
        expect(res.body.data).toHaveProperty('bookingsTrend');
      });
  });
});
```

---

## 7. Performance Considerations

| Concern | Solution |
|---------|----------|
| 5 parallel DB queries | `Promise.all` — runs concurrently, ~50ms total instead of ~250ms sequential |
| Repeated reads | Redis cache with 60s TTL — serves from memory |
| Large result sets | No lists here — just aggregate counts, always small |
| N+1 queries | None — all aggregates are single queries |

---

## 8. Security Checklist

- [x] `JwtAuthGuard` — verifies JWT token
- [x] `RolesGuard` — ensures `role === 'ADMIN'`
- [x] No sensitive data exposed (no PII in dashboard)
- [x] Cache key is not user-specific (all admins see same data — acceptable for MVP)
- [x] Rate limiting via `ThrottlerGuard` (default: 100 req/min/IP)

---

## 9. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/admin/admin.controller.ts` | Route handler, guard decorators |
| Service | `src/admin/admin.service.ts` | Business logic, DB queries, caching |
| Module | `src/admin/admin.module.ts` | NestJS module wiring |
| Cache Service | `src/libs/cache/cache.service.ts` | Redis get/set/invalidate |
| Unit Test | `test/unit/admin.service.spec.ts` | Service logic tests |
| E2E Test | `test/e2e/admin.e2e-spec.ts` | Full HTTP tests |

**Total files: 6** (no new DB models, no new migrations)
