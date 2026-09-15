import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BusinessService } from './business.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';

describe('BusinessService', () => {
  let service: BusinessService;
  let prisma: any;
  let cache: any;

  beforeEach(async () => {
    prisma = {
      business: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      invalidate: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<BusinessService>(BusinessService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a new business', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      prisma.business.create.mockResolvedValue({ id: 'b1', name: 'Wash Co' });

      const result = await service.create('owner1', {
        name: 'Wash Co',
        description: 'A wash',
        address: '123 Main',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        latitude: 30.2,
        longitude: -97.7,
        phone: '555-0100',
        email: 'wash@example.com',
        timezone: 'America/Chicago',
      });

      expect(result).toEqual({ id: 'b1', name: 'Wash Co' });
      expect(prisma.business.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ ownerId: 'owner1', name: 'Wash Co' }),
      }));
    });

    it('should throw ConflictException if active business exists', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'b1', isActive: true });

      await expect(service.create('owner1', {
        name: 'Wash Co',
        description: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        latitude: 0,
        longitude: 0,
        phone: '',
        email: '',
        timezone: '',
      })).rejects.toThrow(ConflictException);
    });

    it('should create business if existing one is inactive', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'b1', isActive: false });
      prisma.business.create.mockResolvedValue({ id: 'b2', name: 'Wash Co' });

      const result = await service.create('owner1', {
        name: 'Wash Co',
        description: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        latitude: 0,
        longitude: 0,
        phone: '',
        email: '',
        timezone: '',
      });

      expect(result).toEqual({ id: 'b2', name: 'Wash Co' });
    });
  });

  describe('update', () => {
    it('should update an existing business', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'b1' });
      prisma.business.update.mockResolvedValue({ id: 'b1', name: 'Updated' });

      const result = await service.update('b1', { name: 'Updated' });

      expect(result).toEqual({ id: 'b1', name: 'Updated' });
      expect(cache.del).toHaveBeenCalledWith('business:b1');
      expect(cache.invalidate).toHaveBeenCalledWith('search:*');
    });

    it('should throw NotFoundException if business not found', async () => {
      prisma.business.findUnique.mockResolvedValue(null);

      await expect(service.update('b1', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return cached business if available', async () => {
      const cached = { id: 'b1', name: 'Cached Business' };
      cache.get.mockResolvedValue(cached);

      const result = await service.findById('b1');

      expect(result).toEqual(cached);
      expect(prisma.business.findUnique).not.toHaveBeenCalled();
    });

    it('should query and cache business on cache miss', async () => {
      const business = { id: 'b1', name: 'Wash Co', services: [], _count: { reviews: 5 } };
      prisma.business.findUnique.mockResolvedValue(business);

      const result = await service.findById('b1');

      expect(result).toEqual(business);
      expect(cache.set).toHaveBeenCalledWith('business:b1', business, 300);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.business.findUnique.mockResolvedValue(null);

      await expect(service.findById('b1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadLogo', () => {
    it('should generate logo URL and update business', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'b1' });
      prisma.business.update.mockResolvedValue({ id: 'b1', logo: 'logos/b1/logo.png' });

      const result = await service.uploadLogo('b1', {
        originalname: 'logo.png',
        mimetype: 'image/png',
      });

      expect(result.logoUrl).toBe('logos/b1/logo.png');
      expect(cache.del).toHaveBeenCalledWith('business:b1');
    });

    it('should throw NotFoundException if business not found', async () => {
      prisma.business.findUnique.mockResolvedValue(null);

      await expect(service.uploadLogo('b1', { originalname: 'x.png', mimetype: 'image/png' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('findPublicById', () => {
    it('should return cached public business', async () => {
      const cached = { id: 'b1', name: 'Public Business' };
      cache.get.mockResolvedValue(cached);

      const result = await service.findPublicById('b1');

      expect(result).toEqual(cached);
    });

    it('should query public business on cache miss', async () => {
      const business = { id: 'b1', name: 'Wash Co', rating: 4.5 };
      prisma.business.findUnique.mockResolvedValue(business);

      const result = await service.findPublicById('b1');

      expect(result).toEqual(business);
      expect(cache.set).toHaveBeenCalledWith('business:public:b1', business, 300);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.business.findUnique.mockResolvedValue(null);

      await expect(service.findPublicById('b1')).rejects.toThrow(NotFoundException);
    });
  });
});
