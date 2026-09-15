import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminReviewService } from './admin-review.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { AuditService } from '../libs/audit/audit.service';

describe('AdminReviewService', () => {
  let service: AdminReviewService;
  let prisma: any;
  let audit: any;

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
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    audit = { write: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminReviewService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<AdminReviewService>(AdminReviewService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('listReviews', () => {
    it('should return paginated reviews with defaults', async () => {
      prisma.review.findMany.mockResolvedValue([{ id: 'r1', rating: 5 }]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.listReviews({}) as any;

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('should apply isHidden filter', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      await service.listReviews({ isHidden: 'true' });

      expect(prisma.review.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ isHidden: true }),
      }));
    });

    it('should apply businessId filter', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      await service.listReviews({ businessId: 'b1' });

      expect(prisma.review.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ businessId: 'b1' }),
      }));
    });

    it('should apply rating range filter', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      await service.listReviews({ minRating: 3, maxRating: 5 });

      expect(prisma.review.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ rating: { gte: 3, lte: 5 } }),
      }));
    });

    it('should paginate with custom page and limit', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      await service.listReviews({ page: 2, limit: 10 });

      expect(prisma.review.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 10,
        take: 10,
      }));
    });
  });

  describe('hideReview', () => {
    it('should hide a review and recompute rating', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'r1', businessId: 'b1' });
      prisma.review.update.mockResolvedValue({ id: 'r1', isHidden: true });
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { rating: 10 } });

      const result = await service.hideReview('r1', 'Spam', 'admin1');

      expect(result.data.isHidden).toBe(true);
      expect(prisma.review.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ isHidden: true, hiddenReason: 'Spam' }),
      }));
      expect(prisma.review.aggregate).toHaveBeenCalled();
      expect(prisma.business.update).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent review', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(service.hideReview('r1', 'Spam', 'admin1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('unhideReview', () => {
    it('should unhide a review and recompute rating', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'r1', businessId: 'b1' });
      prisma.review.update.mockResolvedValue({ id: 'r1', isHidden: false });
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.0 }, _count: { rating: 12 } });

      const result = await service.unhideReview('r1', 'admin1');

      expect(result.data.isHidden).toBe(false);
      expect(prisma.review.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ isHidden: false, hiddenReason: null }),
      }));
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent review', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(service.unhideReview('r1', 'admin1')).rejects.toThrow(NotFoundException);
    });
  });
});
