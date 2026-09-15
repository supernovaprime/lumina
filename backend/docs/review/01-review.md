# Review Module Scaffold

## Purpose
Customer-facing reviews: create (only COMPLETED bookings, own only), edit (within 7 days), list (public by business).

## Files to create:
- `src/review/review.module.ts`
- `src/review/review.controller.ts`
- `src/review/review.service.ts`
- `src/review/dto/create-review.dto.ts`
- `src/review/dto/edit-review.dto.ts`
- `src/review/review.service.spec.ts`

---

## `src/review/dto/create-review.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateReviewDto {
  @IsString() @IsNotEmpty() bookingId: string;
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsString() @IsOptional() comment?: string;
}
```

---

## `src/review/dto/edit-review.dto.ts`

```typescript
import { IsInt, Min, Max, IsOptional, IsString } from 'class-validator';

export class EditReviewDto {
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsString() @IsOptional() comment?: string;
}
```

---

## `src/review/review.service.ts`

```typescript
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { addDays } from 'date-fns';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create review for COMPLETED booking (§9).
   * Validates: booking COMPLETED, owned by caller, no existing review.
   */
  async create(userId: string, dto: { bookingId: string; rating: number; comment?: string }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { review: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== userId) throw new NotFoundException('Booking not found');
    if (booking.status !== 'COMPLETED') throw new BadRequestException('Can only review completed bookings');
    if (booking.review) throw new BadRequestException('Review already exists for this booking');

    const review = await this.prisma.$transaction(async (tx) => {
      const r = await tx.review.create({
        data: {
          bookingId: dto.bookingId,
          customerId: userId,
          businessId: booking.businessId,
          rating: dto.rating,
          comment: dto.comment,
        },
      });

      // Recompute business rating via aggregate
      const aggregate = await tx.review.aggregate({
        where: { businessId: booking.businessId, isHidden: false },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.business.update({
        where: { id: booking.businessId },
        data: {
          rating: aggregate._avg.rating ?? 0,
          reviewCount: aggregate._count.rating,
        },
      });

      return r;
    });

    return review;
  }

  /**
   * Edit review within 7 days.
   */
  async edit(userId: string, reviewId: string, dto: { rating: number; comment?: string }) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) throw new NotFoundException('Review not found');
    if (review.customerId !== userId) throw new ForbiddenException('Not your review');

    const sevenDaysAgo = addDays(new Date(), -7);
    if (review.createdAt < sevenDaysAgo) {
      throw new BadRequestException('Can only edit review within 7 days');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.review.update({
        where: { id: reviewId },
        data: { rating: dto.rating, comment: dto.comment },
      });

      // Recompute business rating
      const aggregate = await tx.review.aggregate({
        where: { businessId: review.businessId, isHidden: false },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.business.update({
        where: { id: review.businessId },
        data: {
          rating: aggregate._avg.rating ?? 0,
          reviewCount: aggregate._count.rating,
        },
      });

      return r;
    });

    return updated;
  }

  /**
   * List public reviews for a business.
   */
  async findByBusiness(businessId: string, page: number = 1, limit: number = 20) {
    const where = { businessId, isHidden: false };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: { customer: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return { reviews, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
```

---

## `src/review/review.controller.ts`

```typescript
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { EditReviewDto } from './dto/edit-review.dto';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @Roles('CUSTOMER')
  @HttpCode(201)
  create(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(user.userId, dto);
  }

  @Patch(':id')
  @Roles('CUSTOMER')
  edit(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: EditReviewDto) {
    return this.reviewService.edit(user.userId, id, dto);
  }

  @Get('business/:businessId')
  findByBusiness(
    @Param('businessId') businessId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewService.findByBusiness(
      businessId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
```

---

## `src/review/review.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { PrismaModule } from '../libs/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
```

---

## `src/review/review.service.spec.ts`

Tests:
1. create succeeds for COMPLETED booking owned by caller
2. create throws NotFoundException for non-owned booking
3. create throws BadRequestException for non-COMPLETED booking
4. create throws BadRequestException for duplicate review
5. create recomputes business rating via aggregate
6. edit succeeds within 7 days
7. edit throws BadRequestException after 7 days
8. edit throws ForbiddenException for non-owned review
9. edit recomputes business rating
10. findByBusiness returns paginated results excluding hidden reviews
