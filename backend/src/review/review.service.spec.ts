import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { BadRequestException, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      booking: { findUnique: jest.fn() },
      review: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
      business: { update: jest.fn() },
      $transaction: jest.fn(),
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

  describe('create', () => {
    it('creates review for COMPLETED booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1', customerId: 'user1', status: 'COMPLETED', businessId: 'biz1', review: null,
      });
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.review.create.mockResolvedValue({ id: 'r1', rating: 5 });
        prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: { rating: 1 } });
        prisma.business.update.mockResolvedValue({});
        return fn(prisma);
      });

      const result = await service.create('user1', { bookingId: 'b1', rating: 5, comment: 'Great!' });
      expect(result.rating).toBe(5);
    });

    it('throws NotFoundException for non-owned booking', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.create('user1', { bookingId: 'b1', rating: 5 })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for non-COMPLETED booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1', customerId: 'user1', status: 'PENDING', businessId: 'biz1', review: null,
      });
      await expect(service.create('user1', { bookingId: 'b1', rating: 5 })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for duplicate review', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1', customerId: 'user1', status: 'COMPLETED', businessId: 'biz1', review: { id: 'r1' },
      });
      await expect(service.create('user1', { bookingId: 'b1', rating: 5 })).rejects.toThrow(BadRequestException);
    });

    it('recomputes business rating', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1', customerId: 'user1', status: 'COMPLETED', businessId: 'biz1', review: null,
      });
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.review.create.mockResolvedValue({});
        prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { rating: 10 } });
        prisma.business.update.mockResolvedValue({});
        return fn(prisma);
      });

      await service.create('user1', { bookingId: 'b1', rating: 5 });
      expect(prisma.business.update).toHaveBeenCalledWith({
        where: { id: 'biz1' },
        data: { rating: 4.5, reviewCount: 10 },
      });
    });
  });

  describe('edit', () => {
    it('edits review within 7 days', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: 'r1', customerId: 'user1', businessId: 'biz1', createdAt: new Date(),
      });
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.review.update.mockResolvedValue({ id: 'r1', rating: 4 });
        prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4 }, _count: { rating: 1 } });
        prisma.business.update.mockResolvedValue({});
        return fn(prisma);
      });

      const result = await service.edit('user1', 'r1', { rating: 4 });
      expect(result.rating).toBe(4);
    });

    it('throws ForbiddenException for non-owned review', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: 'r1', customerId: 'user2', businessId: 'biz1', createdAt: new Date(),
      });
      await expect(service.edit('user1', 'r1', { rating: 4 })).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException after 7 days', async () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      prisma.review.findUnique.mockResolvedValue({
        id: 'r1', customerId: 'user1', businessId: 'biz1', createdAt: oldDate,
      });
      await expect(service.edit('user1', 'r1', { rating: 4 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByBusiness', () => {
    it('returns paginated results', async () => {
      prisma.review.findMany.mockResolvedValue([{ id: 'r1', rating: 5 }]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.findByBusiness('biz1');
      expect(result.reviews).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('respond', () => {
    it('adds response to review', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: 'r1',
        business: { ownerId: 'owner1' },
        response: null,
      });
      prisma.review.update.mockResolvedValue({ id: 'r1', response: 'Thanks!' });

      const result = await service.respond('r1', 'owner1', 'Thanks!');
      expect(result.response).toBe('Thanks!');
      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { response: 'Thanks!' },
      });
    });

    it('throws NotFoundException if review not found', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(service.respond('r1', 'owner1', 'X')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if not business owner', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: 'r1',
        business: { ownerId: 'other' },
        response: null,
      });
      await expect(service.respond('r1', 'owner1', 'X')).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException if already responded', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: 'r1',
        business: { ownerId: 'owner1' },
        response: 'Already responded',
      });
      await expect(service.respond('r1', 'owner1', 'X')).rejects.toThrow(ConflictException);
    });
  });
});
