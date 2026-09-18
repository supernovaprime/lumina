import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BusinessService } from './business.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { StorageService } from '../libs/storage/storage.service';

describe('BusinessService', () => {
  let service: BusinessService;
  let prisma: any;
  let cache: any;
  let storage: any;

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

    storage = {
      upload: jest.fn().mockResolvedValue({ path: 'logos/b1/logo-123.png', publicUrl: 'https://storage.example.com/logos/b1/logo-123.png' }),
      delete: jest.fn().mockResolvedValue(undefined),
      getPublicUrl: jest.fn().mockReturnValue('https://storage.example.com/test'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
        { provide: StorageService, useValue: storage },
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
    const mockFile = { buffer: Buffer.from('fake-image'), mimetype: 'image/png', originalname: 'logo.png' };

    it('should upload logo to storage and update business', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'b1', logo: null });
      prisma.business.update.mockResolvedValue({ id: 'b1', logo: 'logos/b1/logo-123.png' });

      const result = await service.uploadLogo('b1', mockFile);

      expect(storage.upload).toHaveBeenCalledWith('logos/b1', expect.stringContaining('logo-'), Buffer.from('fake-image'), 'image/png');
      expect(prisma.business.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { logo: 'logos/b1/logo-123.png' },
      });
      expect(result.logoUrl).toBe('https://storage.example.com/logos/b1/logo-123.png');
      expect(cache.del).toHaveBeenCalledWith('business:b1');
      expect(cache.invalidate).toHaveBeenCalledWith('search:*');
    });

    it('should delete old logo before uploading new one', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'b1', logo: 'logos/b1/old-logo.png' });
      prisma.business.update.mockResolvedValue({});

      await service.uploadLogo('b1', mockFile);

      expect(storage.delete).toHaveBeenCalledWith('logos/b1/old-logo.png');
    });

    it('should not delete if no old logo', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'b1', logo: null });
      prisma.business.update.mockResolvedValue({});

      await service.uploadLogo('b1', mockFile);

      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if business not found', async () => {
      prisma.business.findUnique.mockResolvedValue(null);

      await expect(service.uploadLogo('b1', mockFile)).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadCover', () => {
    const mockFile = { buffer: Buffer.from('fake-image'), mimetype: 'image/jpeg', originalname: 'cover.jpg' };

    it('should upload cover to storage and update business', async () => {
      storage.upload.mockResolvedValue({ path: 'covers/b1/cover-456.jpg', publicUrl: 'https://storage.example.com/covers/b1/cover-456.jpg' });
      prisma.business.findUnique.mockResolvedValue({ id: 'b1', coverImage: null });
      prisma.business.update.mockResolvedValue({});

      const result = await service.uploadCover('b1', mockFile);

      expect(storage.upload).toHaveBeenCalledWith('covers/b1', expect.stringContaining('cover-'), Buffer.from('fake-image'), 'image/jpeg');
      expect(prisma.business.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { coverImage: 'covers/b1/cover-456.jpg' },
      });
      expect(result.coverUrl).toBe('https://storage.example.com/covers/b1/cover-456.jpg');
    });

    it('should delete old cover before uploading new one', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'b1', coverImage: 'covers/b1/old-cover.jpg' });
      prisma.business.update.mockResolvedValue({});

      await service.uploadCover('b1', mockFile);

      expect(storage.delete).toHaveBeenCalledWith('covers/b1/old-cover.jpg');
    });

    it('should throw NotFoundException if business not found', async () => {
      prisma.business.findUnique.mockResolvedValue(null);

      await expect(service.uploadCover('b1', mockFile)).rejects.toThrow(NotFoundException);
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
