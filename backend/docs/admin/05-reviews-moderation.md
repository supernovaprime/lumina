# Admin Feature: Reviews Moderation

## Brief Description

Reviews Moderation allows admins to manage customer reviews that violate platform policies. Admins can hide reviews (never delete — financial record integrity), view flagged reviews, and maintain platform trust. Hidden reviews are excluded from business rating calculations. This keeps the review system fair while preserving audit trails.

**Endpoints:**
- `GET /api/v1/admin/reviews` — List reviews (filterable by flagged/hidden status)
- `PATCH /api/v1/reviews/:id/hide` — Hide a review
- `PATCH /api/v1/reviews/:id/unhide` — Unhide a review

**Auth:** ADMIN only  
**Cost:** $0

---

## 1. What This Feature Does

### 1.1 List Reviews
Admin sends `GET /admin/reviews?flagged=true&businessId=uuid&page=1`. Backend returns a paginated list of reviews with customer and business info. Filterable by hidden status, business, or rating.

### 1.2 Hide Review
Admin sends `PATCH /reviews/:id/hide { reason }`. Backend:
1. Sets `Review.isHidden=true` + `hiddenReason=reason`.
2. Recomputes business rating (excludes hidden reviews).
3. Writes audit log.

### 1.3 Unhide Review
Admin sends `PATCH /reviews/:id/unhide`. Backend:
1. Sets `Review.isHidden=false`.
2. Recomputes business rating (includes the review again).
3. Writes audit log.

---

## 2. API Contracts

### 2.1 List Reviews

```
GET /api/v1/admin/reviews?flagged=true&businessId=uuid&minRating=1&page=1&limit=20
Authorization: Bearer <admin-jwt>
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `isHidden` | boolean | — | Filter by hidden status |
| `businessId` | uuid | — | Filter by business |
| `minRating` | number | — | Minimum rating (1-5) |
| `maxRating` | number | — | Maximum rating (1-5) |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "rating": 1,
      "comment": "Terrible service, they scratched my car!",
      "isHidden": false,
      "hiddenReason": null,
      "createdAt": "2026-09-13T16:00:00Z",
      "customer": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "business": {
        "id": "uuid",
        "name": "Quick Wash Pro"
      },
      "booking": {
        "id": "uuid",
        "date": "2026-09-12",
        "service": "Full Detail"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

### 2.2 Hide Review

```
PATCH /api/v1/reviews/:id/hide
Authorization: Bearer <admin-jwt>
```

**Request Body:**

```json
{
  "reason": "Review contains profanity and personal attacks"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isHidden": true,
    "hiddenReason": "Review contains profanity and personal attacks",
    "businessRatingAfter": 4.2,
    "message": "Review hidden successfully"
  }
}
```

### 2.3 Unhide Review

```
PATCH /api/v1/reviews/:id/unhide
Authorization: Bearer <admin-jwt>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isHidden": false,
    "businessRatingAfter": 4.0,
    "message": "Review unhidden successfully"
  }
}
```

---

## 3. Data Model

No new tables. Updates existing `Review` table:

| Table | Columns Updated |
|-------|----------------|
| `Review` | `isHidden`, `hiddenReason` |
| `Business` | `rating`, `reviewCount` (recomputed) |

### Review Model Fields (relevant)

```prisma
model Review {
  id          String   @id @default(uuid())
  bookingId   String   @unique
  customerId  String
  businessId  String
  rating      Int      // 1-5
  comment     String?
  response    String?
  isHidden    Boolean  @default(false)  // Admin moderation
  hiddenReason String?                  // Why it was hidden
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 4. Implementation Files

### 4.1 DTOs

**`admin/dto/list-reviews.dto.ts`**

```typescript
import { IsOptional, IsBooleanString, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListReviewsDto {
  @IsOptional()
  @IsBooleanString()
  isHidden?: string;

  @IsOptional()
  @IsString()
  businessId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  maxRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

**`admin/dto/hide-review.dto.ts`**

```typescript
import { IsString, MaxLength } from 'class-validator';

export class HideReviewDto {
  @IsString()
  @MaxLength(500)
  reason: string;
}
```

### 4.2 Controller

```typescript
import { Controller, Get, Patch, Param, Query, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { ListReviewsDto } from './dto/list-reviews.dto';
import { HideReviewDto } from './dto/hide-review.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('reviews')
  async listReviews(@Query() query: ListReviewsDto) {
    return this.adminService.listReviews(query);
  }

  @Patch('reviews/:id/hide')
  async hideReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: HideReviewDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.hideReview(id, body.reason, adminId);
  }

  @Patch('reviews/:id/unhide')
  async unhideReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.unhideReview(id, adminId);
  }
}
```

### 4.3 Service

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { AuditService } from '../libs/audit/audit.service';
import { ListReviewsDto } from './dto/list-reviews.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listReviews(dto: ListReviewsDto) {
    const { isHidden, businessId, minRating, maxRating, page, limit } = dto;

    const where: any = {};
    if (isHidden !== undefined) where.isHidden = isHidden === 'true';
    if (businessId) where.businessId = businessId;
    if (minRating || maxRating) {
      where.rating = {};
      if (minRating) where.rating.gte = minRating;
      if (maxRating) where.rating.lte = maxRating;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          customer: {
            include: {
              user: { select: { email: true } },
            },
          },
          business: { select: { id: true, name: true } },
          booking: {
            select: {
              id: true,
              date: true,
              service: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        isHidden: r.isHidden,
        hiddenReason: r.hiddenReason,
        createdAt: r.createdAt,
        customer: {
          id: r.customerId,
          firstName: r.customer.firstName,
          lastName: r.customer.lastName,
          email: r.customer.user.email,
        },
        business: r.business,
        booking: {
          id: r.bookingId,
          date: r.booking.date,
          service: r.booking.service.name,
        },
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async hideReview(id: string, reason: string, adminId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { business: true },
    });

    if (!review) throw new NotFoundException('Review not found');
    if (review.isHidden) throw new ConflictException('Review is already hidden');

    await this.prisma.$transaction(async (tx) => {
      // 1. Hide the review
      await tx.review.update({
        where: { id },
        data: { isHidden: true, hiddenReason: reason },
      });

      // 2. Recompute business rating (exclude hidden)
      await this.recomputeRating(tx, review.businessId);

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'REVIEW_HIDDEN',
          entityType: 'REVIEW',
          entityId: id,
          metadata: { reason, businessId: review.businessId },
        },
      });
    });

    // 4. Get updated rating
    const business = await this.prisma.business.findUnique({
      where: { id: review.businessId },
      select: { rating: true },
    });

    return {
      data: {
        id,
        isHidden: true,
        hiddenReason: reason,
        businessRatingAfter: business.rating,
        message: 'Review hidden successfully',
      },
    };
  }

  async unhideReview(id: string, adminId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { business: true },
    });

    if (!review) throw new NotFoundException('Review not found');
    if (!review.isHidden) throw new ConflictException('Review is not hidden');

    await this.prisma.$transaction(async (tx) => {
      // 1. Unhide the review
      await tx.review.update({
        where: { id },
        data: { isHidden: false, hiddenReason: null },
      });

      // 2. Recompute business rating (include this review)
      await this.recomputeRating(tx, review.businessId);

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'REVIEW_UNHIDDEN',
          entityType: 'REVIEW',
          entityId: id,
          metadata: { businessId: review.businessId },
        },
      });
    });

    // 4. Get updated rating
    const business = await this.prisma.business.findUnique({
      where: { id: review.businessId },
      select: { rating: true },
    });

    return {
      data: {
        id,
        isHidden: false,
        businessRatingAfter: business.rating,
        message: 'Review unhidden successfully',
      },
    };
  }

  private async recomputeRating(tx: any, businessId: string) {
    // Use DB aggregate, not incremental float drift
    const result = await tx.review.aggregate({
      where: { businessId, isHidden: false },
      _avg: { rating: true },
      _count: true,
    });

    await tx.business.update({
      where: { id: businessId },
      data: {
        rating: result._avg.rating || 0,
        reviewCount: result._count,
      },
    });
  }
}
```

### 4.4 Module

```typescript
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { AuditModule } from '../libs/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
```

---

## 5. Rating Recomputation Logic

When a review is hidden or unhidden, the business rating must be recomputed:

```sql
-- Hidden reviews excluded from aggregate
SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
FROM reviews
WHERE business_id = ? AND is_hidden = false;
```

**Why DB aggregate, not incremental:**
- Incremental float math drifts over time.
- DB `AVG()` is authoritative and always correct.
- Runs inside transaction — atomic with the hide/unhide.

---

## 6. Hide vs Delete

| Action | Use Case | Reversible | Audit Trail |
|--------|----------|------------|-------------|
| **Hide** | Policy violation, spam, profanity | Yes (unhide) | Yes (hiddenReason + AuditLog) |
| **Delete** | Never used | No | Lost — breaks financial records |

**Rule:** Reviews are never hard-deleted. `isHidden=true` hides from public view and excludes from rating calculation, but the record remains for audit and dispute resolution.

---

## 7. Testing

### Unit Tests

```typescript
describe('AdminService', () => {
  describe('hideReview', () => {
    it('should hide review and recompute rating', async () => { ... });
    it('should throw NotFoundException for non-existent review', async () => { ... });
    it('should throw ConflictException if already hidden', async () => { ... });
  });

  describe('unhideReview', () => {
    it('should unhide review and recompute rating', async () => { ... });
    it('should throw ConflictException if not hidden', async () => { ... });
  });

  describe('recomputeRating', () => {
    it('should exclude hidden reviews from AVG', async () => { ... });
    it('should handle zero visible reviews', async () => { ... });
  });
});
```

### E2E Tests

```typescript
describe('Admin Reviews Moderation (e2e)', () => {
  it('GET /admin/reviews lists all reviews', () => { ... });
  it('GET /admin/reviews?isHidden=true filters hidden', () => { ... });
  it('PATCH /admin/reviews/:id/hide hides review', () => { ... });
  it('PATCH /admin/reviews/:id/unhide unhides review', () => { ... });
  it('hiding review updates business rating', () => { ... });
  it('returns 403 for non-admin users', () => { ... });
});
```

---

## 8. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/admin/admin.controller.ts` | Route handlers for review moderation |
| Service | `src/admin/admin.service.ts` | Business logic, DB queries |
| Module | `src/admin/admin.module.ts` | NestJS module wiring |
| DTO (list) | `src/admin/dto/list-reviews.dto.ts` | Query param validation |
| DTO (hide) | `src/admin/dto/hide-review.dto.ts` | Hide body validation |
| Unit Test | `test/unit/admin.service.spec.ts` | Service logic tests |
| E2E Test | `test/e2e/admin.e2e-spec.ts` | Full HTTP tests |

**Total files: 7** (1 model field addition: `isHidden`, `hiddenReason` on Review)
