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
