import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ReviewService } from './review.service';
import { PrismaService } from '../libs/prisma/prisma.service';

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      review: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      business: { update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findByBusiness', () => {
    it('should return reviews with summary', async () => {
      prisma.review.findMany
        .mockResolvedValueOnce([{ id: 'r1', rating: 5, customer: { firstName: 'John' } }])
        .mockResolvedValueOnce([{ rating: 5 }, { rating: 4 }, { rating: 5 }]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.findByBusiness('b1', 1) as any;

      expect(result.reviews).toHaveLength(1);
      expect(result.summary.totalReviews).toBe(3);
      expect(result.summary.averageRating).toBe(4.7);
      expect(result.summary.ratingDistribution[5]).toBe(2);
      expect(result.summary.ratingDistribution[4]).toBe(1);
    });

    it('should return zero average for no reviews', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      const result = await service.findByBusiness('b1', 1) as any;
      expect(result.summary.averageRating).toBe(0);
    });
  });

  describe('respond', () => {
    it('should add response to review', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: 'r1',
        business: { ownerId: 'owner1' },
        response: null,
      });
      prisma.review.update.mockResolvedValue({ id: 'r1', response: 'Thanks!' });

      const result = await service.respond('r1', 'owner1', 'Thanks!');
      expect(result.response).toBe('Thanks!');
    });

    it('should throw NotFoundException if review not found', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(service.respond('r1', 'owner1', 'X')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: 'r1',
        business: { ownerId: 'other' },
        response: null,
      });

      await expect(service.respond('r1', 'owner1', 'X')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if already responded', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: 'r1',
        business: { ownerId: 'owner1' },
        response: 'Already responded',
      });

      await expect(service.respond('r1', 'owner1', 'X')).rejects.toThrow(ConflictException);
    });
  });

  describe('recalculateRating', () => {
    it('should update business rating and review count', async () => {
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { rating: 12 },
      });
      prisma.business.update.mockResolvedValue({});

      await service.recalculateRating('b1');

      expect(prisma.business.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { rating: 4.5, reviewCount: 12 },
      });
    });

    it('should handle zero reviews', async () => {
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: null },
        _count: { rating: 0 },
      });

      await service.recalculateRating('b1');

      expect(prisma.business.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { rating: 0, reviewCount: 0 },
      });
    });
  });
});
