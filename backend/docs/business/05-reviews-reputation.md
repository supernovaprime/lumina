# Business Feature: Reviews & Reputation

## Brief Description

Business owners view all reviews for their business and respond to each review (one response per review). Reviews include a 1-5 star rating and optional comment. The business's average rating is automatically recalculated when reviews are added or updated.

**Endpoints:**
- `GET /api/v1/businesses/:id/reviews` — View reviews (public)
- `POST /api/v1/reviews/:reviewId/response` — Respond to review (business owner)

**Auth:** Public (view), BUSINESS role (respond)
**Cost:** $0

---

## 1. What This Feature Does

1. Customers see all public reviews for a business when viewing the business profile.
2. Business owner can see all reviews (including hidden ones) for their business.
3. Owner can post one response per review.
4. Average rating is recalculated on every new review.
5. Admin can hide reviews that violate policies (see admin docs).

---

## 2. API Contract

### View Reviews (Public)

```
GET /api/v1/businesses/:id/reviews?page=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "rev-1",
        "bookingId": "bk-1",
        "customer": {
          "firstName": "John",
          "lastName": "D."
        },
        "rating": 5,
        "comment": "Excellent service! My car looks brand new.",
        "response": "Thank you, John! We appreciate your business.",
        "isHidden": false,
        "createdAt": "2026-09-14T12:00:00Z"
      }
    ],
    "summary": {
      "averageRating": 4.7,
      "totalReviews": 128,
      "ratingDistribution": {
        "5": 80,
        "4": 30,
        "3": 10,
        "2": 5,
        "1": 3
      }
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 128
    }
  }
}
```

### Respond to Review

```
POST /api/v1/reviews/:reviewId/response
Authorization: Bearer <business-jwt>
```

**Request body:**
```json
{
  "response": "Thank you for your feedback! We're glad you enjoyed the service."
}
```

**Response — Success:**
```json
{
  "success": true,
  "data": {
    "id": "rev-1",
    "response": "Thank you for your feedback! We're glad you enjoyed the service.",
    "updatedAt": "2026-09-14T14:00:00Z"
  }
}
```

**Response — Error (already responded):**
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_RESPONDED",
    "message": "You have already responded to this review"
  }
}
```

---

## 3. Data Model

### Review Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `bookingId` | UUID | FK → Booking, unique (one review per booking) |
| `customerId` | UUID | FK → Customer |
| `businessId` | UUID | FK → Business |
| `rating` | Int | 1-5 stars |
| `comment` | String? | Optional text review |
| `response` | String? | Business owner response |
| `isHidden` | Boolean | Admin-hidden flag |
| `hiddenReason` | String? | Why hidden |
| `createdAt` | DateTime | Created at |
| `updatedAt` | DateTime | Updated at |

### Business Table (derived)

| Column | Type | Notes |
|--------|------|-------|
| `rating` | Float | Average rating (recalculated) |
| `reviewCount` | Int | Total visible reviews |

---

## 4. Implementation Files

### 4.1 DTOs

#### `respond-review.dto.ts`
```typescript
import { IsString, MinLength, MaxLength } from 'class-validator';

export class RespondReviewDto {
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  response: string;
}
```

### 4.2 Controller — `review.controller.ts`

```typescript
import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { ReviewService } from './review.service';
import { RespondReviewDto } from './dto/respond-review.dto';

@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('businesses/:businessId/reviews')
  async findByBusiness(
    @Param('businessId') businessId: string,
    @Query('page') page?: string,
  ) {
    return this.reviewService.findByBusiness(businessId, Number(page) || 1);
  }

  @Post('reviews/:reviewId/response')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  async respond(
    @Param('reviewId') reviewId: string,
    @Body() dto: RespondReviewDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewService.respond(reviewId, userId, dto.response);
  }
}
```

### 4.3 Service — `review.service.ts`

```typescript
import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async findByBusiness(businessId: string, page: number) {
    const where = { businessId, isHidden: false };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 20,
        take: 20,
      }),
      this.prisma.review.count({ where }),
    ]);

    // Calculate rating distribution
    const allReviews = await this.prisma.review.findMany({
      where: { businessId, isHidden: false },
      select: { rating: true },
    });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of allReviews) {
      distribution[r.rating as keyof typeof distribution]++;
      sum += r.rating;
    }

    return {
      reviews,
      summary: {
        averageRating: allReviews.length > 0 ? Math.round((sum / allReviews.length) * 10) / 10 : 0,
        totalReviews: allReviews.length,
        ratingDistribution: distribution,
      },
      pagination: { page, limit: 20, total },
    };
  }

  async respond(reviewId: string, userId: string, response: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { business: true },
    });

    if (!review) throw new NotFoundException('Review not found');
    if (review.business.ownerId !== userId) {
      throw new ForbiddenException('You can only respond to reviews for your business');
    }
    if (review.response) {
      throw new ConflictException({
        code: 'ALREADY_RESPONDED',
        message: 'You have already responded to this review',
      });
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { response },
    });
  }

  async recalculateRating(businessId: string) {
    const result = await this.prisma.review.aggregate({
      where: { businessId, isHidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        rating: result._avg.rating || 0,
        reviewCount: result._count.rating,
      },
    });
  }
}
```

---

## 5. Rating Recalculation

Average rating is recalculated on every new review (via `recalculateRating`). This is a simple aggregate query — no caching needed for MVP since review volume is low.

```typescript
// Called after review creation
await reviewService.recalculateRating(review.businessId);
```

---

## 6. Security Checklist

- [x] `JwtAuthGuard` — authenticated users only (respond)
- [x] `RolesGuard` — BUSINESS role required (respond)
- [x] Ownership check — only business owner can respond to their reviews
- [x] One response per review enforced at application level
- [x] Hidden reviews excluded from public listing
- [x] Rate limiting via `ThrottlerGuard`

---

## 7. Testing

### Unit Test — `review.service.spec.ts`

```typescript
describe('ReviewService', () => {
  describe('findByBusiness', () => {
    it('should return paginated reviews', async () => { /* ... */ });
    it('should exclude hidden reviews', async () => { /* ... */ });
    it('should calculate rating summary', async () => { /* ... */ });
  });

  describe('respond', () => {
    it('should add response to review', async () => { /* ... */ });
    it('should throw if not business owner', async () => { /* ... */ });
    it('should throw if already responded', async () => { /* ... */ });
  });
});
```

### E2E Test — `review.e2e-spec.ts`

```typescript
describe('Reviews (e2e)', () => {
  it('GET /businesses/:id/reviews returns reviews', () => { /* ... */ });
  it('POST /reviews/:id/response adds response', () => { /* ... */ });
  it('POST /reviews/:id/response returns 409 if already responded', () => { /* ... */ });
});
```

---

## 8. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/review/review.controller.ts` | Route handlers |
| Service | `src/review/review.service.ts` | Review logic, rating calculation |
| Module | `src/review/review.module.ts` | NestJS module wiring |
| DTO | `src/review/dto/respond-review.dto.ts` | Validation |
| Unit Test | `src/review/review.service.spec.ts` | Service tests |
| E2E Test | `test/e2e/review.e2e-spec.ts` | Full HTTP tests |

**Total files: 6** (no new DB models — uses existing `Review` + `Business` tables)
