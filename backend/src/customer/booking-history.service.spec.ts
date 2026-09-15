import { Test, TestingModule } from '@nestjs/testing';
import { BookingHistoryService } from './booking-history.service';
import { PrismaService } from '../libs/prisma/prisma.service';

describe('BookingHistoryService', () => {
  let service: BookingHistoryService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      booking: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingHistoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BookingHistoryService>(BookingHistoryService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return paginated bookings with defaults', async () => {
      prisma.booking.findMany.mockResolvedValue([{ id: 'bk1', status: 'CONFIRMED' }]);
      prisma.booking.count.mockResolvedValue(1);

      const result = await service.findAll('c1', {});

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('should apply status filter', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAll('c1', { status: 'CONFIRMED' });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: 'CONFIRMED' }),
      }));
    });

    it('should apply upcoming filter (future dates)', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAll('c1', { upcoming: 'true' });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          date: { gte: expect.any(Date) },
        }),
        orderBy: { date: 'asc' },
      }));
    });

    it('should apply past filter (past dates)', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAll('c1', { upcoming: 'false' });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          date: { lt: expect.any(Date) },
        }),
        orderBy: { date: 'desc' },
      }));
    });

    it('should paginate with custom page and limit', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAll('c1', { page: 2, limit: 10 });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 10,
        take: 10,
      }));
    });

    it('should always filter by customerId', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAll('c1', {});

      expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ customerId: 'c1' }),
      }));
    });
  });
});
