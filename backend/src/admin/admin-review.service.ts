import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { AuditService } from '../libs/audit/audit.service';
import { ListReviewsDto } from './dto/list-reviews.dto';

@Injectable()
export class AdminReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listReviews(dto: ListReviewsDto) {
    const { isHidden, businessId, minRating, maxRating, page = 1, limit = 20 } = dto;

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
            include: { user: { select: { email: true } } },
          },
          business: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async hideReview(id: string, reason: string, adminId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.review.update({
        where: { id },
        data: { isHidden: true, hiddenReason: reason },
      });

      await this.recomputeRating(tx, review.businessId);

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'REVIEW_HIDDEN',
          entityType: 'REVIEW',
          entityId: id,
          metadata: { reason },
        },
      });

      return r;
    });

    return { data: { id: updated.id, isHidden: true } };
  }

  async unhideReview(id: string, adminId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.review.update({
        where: { id },
        data: { isHidden: false, hiddenReason: null },
      });

      await this.recomputeRating(tx, review.businessId);

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'REVIEW_UNHIDDEN',
          entityType: 'REVIEW',
          entityId: id,
          metadata: {},
        },
      });

      return r;
    });

    return { data: { id: updated.id, isHidden: false } };
  }

  private async recomputeRating(tx: any, businessId: string) {
    const result = await tx.review.aggregate({
      where: { businessId, isHidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.business.update({
      where: { id: businessId },
      data: {
        rating: result._avg.rating || 0,
        reviewCount: result._count.rating,
      },
    });
  }
}
