import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingService } from './booking.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: any;
  let cache: any;

  beforeEach(async () => {
    prisma = {
      booking: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      timeSlot: { update: jest.fn() },
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
      invalidate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('listByBusiness', () => {
    it('should return paginated bookings', async () => {
      const bookings = [{ id: 'bk1', status: 'CONFIRMED' }];
      prisma.booking.findMany.mockResolvedValue(bookings);
      prisma.booking.count.mockResolvedValue(1);

      const result = await service.listByBusiness('b1', { page: 1 });

      expect(result.bookings).toEqual(bookings);
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1 });
    });

    it('should apply date filter', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.listByBusiness('b1', { date: '2026-01-15', page: 1 });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ date: new Date('2026-01-15') }),
      }));
    });

    it('should apply status filter', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.listByBusiness('b1', { status: 'PENDING', page: 1 });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDING' }),
      }));
    });
  });

  describe('findById', () => {
    it('should return booking with relations', async () => {
      const booking = { id: 'bk1', customer: {}, vehicle: {}, service: {}, payment: {} };
      prisma.booking.findFirst.mockResolvedValue(booking);

      const result = await service.findById('b1', 'bk1');
      expect(result).toEqual(booking);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      await expect(service.findById('b1', 'bk1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should confirm a pending booking', async () => {
      prisma.booking.findFirst.mockResolvedValue({ id: 'bk1', status: 'PENDING' });
      prisma.booking.update.mockResolvedValue({ id: 'bk1', status: 'CONFIRMED' });

      const result = await service.updateStatus('b1', 'bk1', 'CONFIRMED');
      expect(result.status).toBe('CONFIRMED');
    });

    it('should cancel and decrement time slot', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        id: 'bk1', status: 'CONFIRMED', timeSlotId: 'ts1',
      });
      prisma.booking.update.mockResolvedValue({ id: 'bk1', status: 'CANCELLED' });

      await service.updateStatus('b1', 'bk1', 'CANCELLED');

      expect(prisma.timeSlot.update).toHaveBeenCalledWith({
        where: { id: 'ts1' },
        data: { currentBookings: { decrement: 1 } },
      });
      expect(cache.invalidate).toHaveBeenCalledWith('slots:b1:*');
    });

    it('should throw BadRequestException for invalid transition', async () => {
      prisma.booking.findFirst.mockResolvedValue({ id: 'bk1', status: 'COMPLETED' });

      await expect(service.updateStatus('b1', 'bk1', 'CONFIRMED')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if booking not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      await expect(service.updateStatus('b1', 'bk1', 'CONFIRMED')).rejects.toThrow(NotFoundException);
    });
  });
});
