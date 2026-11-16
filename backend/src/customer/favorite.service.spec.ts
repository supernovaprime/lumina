import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteService } from './favorite.service';
import { PrismaService } from '../libs/prisma/prisma.service';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      favorite: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      timeSlot: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return all favorites with business info and nextAvailableSlot', async () => {
      const favorites = [
        {
          id: 'f1',
          businessId: 'b1',
          business: { id: 'b1', name: 'Quick Wash', rating: 4.5 },
        },
      ];
      prisma.favorite.findMany.mockResolvedValue(favorites);

      const result = await service.findAll('c1');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('nextAvailableSlot');
      expect(prisma.favorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerId: 'c1' },
          include: expect.objectContaining({
            business: expect.objectContaining({
              select: expect.objectContaining({ name: true, rating: true }),
            }),
          }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('add', () => {
    it('should upsert a favorite (add)', async () => {
      prisma.favorite.upsert.mockResolvedValue({
        id: 'f1',
        customerId: 'c1',
        businessId: 'b1',
        business: { id: 'b1', name: 'Quick Wash' },
      });

      const result = await service.add('c1', 'b1');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'f1',
          customerId: 'c1',
          businessId: 'b1',
        }),
      );
      expect(prisma.favorite.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            customerId_businessId: { customerId: 'c1', businessId: 'b1' },
          },
        }),
      );
    });

    it('should be idempotent (no error if already favorited)', async () => {
      prisma.favorite.upsert.mockResolvedValue({
        id: 'f1',
        customerId: 'c1',
        businessId: 'b1',
      });

      await service.add('c1', 'b1');
      await service.add('c1', 'b1');

      expect(prisma.favorite.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('remove', () => {
    it('should remove a favorite', async () => {
      prisma.favorite.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.remove('c1', 'b1');
      expect(result).toEqual({ message: 'Favorite removed' });
      expect(prisma.favorite.deleteMany).toHaveBeenCalledWith({
        where: { customerId: 'c1', businessId: 'b1' },
      });
    });

    it('should be idempotent (no error if not found)', async () => {
      prisma.favorite.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.remove('c1', 'b1');
      expect(result).toEqual({ message: 'Favorite removed' });
    });
  });
});
