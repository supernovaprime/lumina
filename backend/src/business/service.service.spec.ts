import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ServiceService } from './service.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';

describe('ServiceService', () => {
  let service: ServiceService;
  let prisma: any;
  let cache: any;

  beforeEach(async () => {
    prisma = {
      service: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      priceModifier: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      booking: { count: jest.fn() },
      $transaction: jest.fn(cb => Array.isArray(cb) ? Promise.all(cb) : cb()),
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
      invalidate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<ServiceService>(ServiceService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return all active services by default', async () => {
      const services = [{ id: 's1', name: 'Basic Wash' }];
      prisma.service.findMany.mockResolvedValue(services);

      const result = await service.findAll('b1');

      expect(result).toEqual(services);
      expect(prisma.service.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { businessId: 'b1', isActive: true },
      }));
    });

    it('should include inactive when activeOnly is false', async () => {
      prisma.service.findMany.mockResolvedValue([]);

      await service.findAll('b1', false);

      expect(prisma.service.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { businessId: 'b1' },
      }));
    });
  });

  describe('create', () => {
    it('should create a service', async () => {
      prisma.service.create.mockResolvedValue({ id: 's1', name: 'Basic Wash' });

      const result = await service.create('b1', {
        name: 'Basic Wash',
        description: 'A wash',
        category: 'EXTERIOR',
        basePrice: 2500,
        durationMinutes: 30,
      });

      expect(result).toEqual({ id: 's1', name: 'Basic Wash' });
      expect(prisma.service.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ businessId: 'b1', name: 'Basic Wash' }),
      }));
    });
  });

  describe('update', () => {
    it('should update a service', async () => {
      prisma.service.findFirst.mockResolvedValue({ id: 's1', businessId: 'b1' });
      prisma.service.update.mockResolvedValue({ id: 's1', name: 'Updated' });

      const result = await service.update('b1', 's1', { name: 'Updated' });

      expect(result).toEqual({ id: 's1', name: 'Updated' });
    });

    it('should throw NotFoundException if service not found', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(service.update('b1', 's1', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a service', async () => {
      prisma.service.findFirst.mockResolvedValue({ id: 's1' });
      prisma.booking.count.mockResolvedValue(0);
      prisma.service.update.mockResolvedValue({ id: 's1', isActive: false });

      const result = await service.remove('b1', 's1');

      expect(result).toEqual({ id: 's1', isActive: false });
      expect(prisma.service.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { isActive: false },
      }));
    });

    it('should throw ConflictException if future bookings exist', async () => {
      prisma.service.findFirst.mockResolvedValue({ id: 's1' });
      prisma.booking.count.mockResolvedValue(3);

      await expect(service.remove('b1', 's1')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if service not found', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(service.remove('b1', 's1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setModifiers', () => {
    it('should replace modifiers in transaction', async () => {
      prisma.service.findFirst.mockResolvedValue({ id: 's1' });
      prisma.priceModifier.findMany.mockResolvedValue([
        { id: 'm1', vehicleType: 'SUV', vehicleSize: 'LARGE', multiplier: 1.5 },
      ]);

      const result = await service.setModifiers('b1', 's1', [
        { vehicleType: 'SUV', vehicleSize: 'LARGE', multiplier: 1.5 },
      ]);

      expect(prisma.priceModifier.deleteMany).toHaveBeenCalledWith({ where: { serviceId: 's1' } });
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if service not found', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(service.setModifiers('b1', 's1', [])).rejects.toThrow(NotFoundException);
    });
  });
});
