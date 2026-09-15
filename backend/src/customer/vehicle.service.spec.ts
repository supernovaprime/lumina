import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { PrismaService } from '../libs/prisma/prisma.service';

describe('VehicleService', () => {
  let service: VehicleService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      vehicle: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      booking: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return all vehicles for customer', async () => {
      const vehicles = [{ id: 'v1', make: 'Toyota', model: 'Camry' }];
      prisma.vehicle.findMany.mockResolvedValue(vehicles);

      const result = await service.findAll('c1');
      expect(result).toEqual(vehicles);
      expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
        where: { customerId: 'c1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should create a vehicle', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);
      prisma.vehicle.create.mockResolvedValue({ id: 'v1', make: 'Toyota', model: 'Camry' });

      const result = await service.create('c1', {
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        type: 'SEDAN',
        size: 'MEDIUM',
        color: 'White',
        licensePlate: 'GR-1234',
      });

      expect(result).toEqual({ id: 'v1', make: 'Toyota', model: 'Camry' });
      expect(prisma.vehicle.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if license plate already exists', async () => {
      prisma.vehicle.findUnique.mockResolvedValue({ id: 'v1', licensePlate: 'GR-1234' });

      await expect(service.create('c1', {
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        type: 'SEDAN',
        size: 'MEDIUM',
        licensePlate: 'GR-1234',
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a vehicle', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', customerId: 'c1', licensePlate: 'GR-1234' });
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', color: 'Black' });

      const result = await service.update('c1', 'v1', { color: 'Black' });
      expect(result).toEqual({ id: 'v1', color: 'Black' });
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);
      await expect(service.update('c1', 'v1', { color: 'Black' })).rejects.toThrow(NotFoundException);
    });

    it('should check for duplicate license plate on change', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', customerId: 'c1', licensePlate: 'GR-1234' });
      prisma.vehicle.findUnique.mockResolvedValue({ id: 'v2', licensePlate: 'GR-5678' });

      await expect(service.update('c1', 'v1', { licensePlate: 'GR-5678' })).rejects.toThrow(ConflictException);
    });

    it('should allow same license plate (no change)', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', customerId: 'c1', licensePlate: 'GR-1234' });
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', color: 'Black' });

      const result = await service.update('c1', 'v1', { licensePlate: 'GR-1234', color: 'Black' });
      expect(result).toEqual({ id: 'v1', color: 'Black' });
      expect(prisma.vehicle.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a vehicle', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', customerId: 'c1' });
      prisma.booking.count.mockResolvedValue(0);
      prisma.vehicle.delete.mockResolvedValue({ id: 'v1' });

      const result = await service.remove('c1', 'v1');
      expect(result).toEqual({ id: 'v1' });
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);
      await expect(service.remove('c1', 'v1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if future bookings exist', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', customerId: 'c1' });
      prisma.booking.count.mockResolvedValue(2);

      await expect(service.remove('c1', 'v1')).rejects.toThrow(ConflictException);
    });
  });
});
