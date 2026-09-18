import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { addDays } from 'date-fns';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

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
