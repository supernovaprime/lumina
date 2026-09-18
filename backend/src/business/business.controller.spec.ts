import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';

describe('BusinessController', () => {
  let controller: BusinessController;
  let businessService: any;

  beforeEach(async () => {
    businessService = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findPublicById: jest.fn(),
      uploadLogo: jest.fn(),
      uploadCover: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessController],
      providers: [
        { provide: BusinessService, useValue: businessService },
      ],
    }).compile();

    controller = module.get<BusinessController>(BusinessController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a business for BUSINESS role', async () => {
      const dto = {
        name: 'Wash Co',
        address: '123 Main',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        latitude: 30.2,
        longitude: -97.7,
        phone: '555-0100',
        email: 'wash@example.com',
        timezone: 'America/Chicago',
      };
      businessService.create.mockResolvedValue({ id: 'b1', ...dto });

      const result = await controller.create('owner1', dto);

      expect(result).toEqual({ id: 'b1', ...dto });
      expect(businessService.create).toHaveBeenCalledWith('owner1', dto);
    });
  });

  describe('update', () => {
    it('should update own business', async () => {
      businessService.findById.mockResolvedValue({ id: 'b1', ownerId: 'owner1' });
      businessService.update.mockResolvedValue({ id: 'b1', name: 'Updated' });

      const result = await controller.update('b1', 'owner1', { name: 'Updated' });

      expect(result).toEqual({ id: 'b1', name: 'Updated' });
      expect(businessService.update).toHaveBeenCalledWith('b1', { name: 'Updated' });
    });

    it('should throw BadRequestException when updating another business', async () => {
      businessService.findById.mockResolvedValue({ id: 'b1', ownerId: 'other-owner' });

      await expect(
        controller.update('b1', 'owner1', { name: 'Hacked' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return public business view', async () => {
      businessService.findPublicById.mockResolvedValue({ id: 'b1', name: 'Wash Co' });

      const result = await controller.findOne('b1');

      expect(result).toEqual({ id: 'b1', name: 'Wash Co' });
      expect(businessService.findPublicById).toHaveBeenCalledWith('b1');
    });
  });

  describe('uploadLogo', () => {
    const mockFile = {
      buffer: Buffer.from('fake-image'),
      mimetype: 'image/png',
      originalname: 'logo.png',
    };

    it('should upload logo for own business', async () => {
      businessService.findById.mockResolvedValue({ id: 'b1', ownerId: 'owner1' });
      businessService.uploadLogo.mockResolvedValue({
        logoUrl: 'https://storage.example.com/logos/b1/logo-123.png',
        path: 'logos/b1/logo-123.png',
      });

      const result = await controller.uploadLogo('b1', 'owner1', mockFile);

      expect(result).toEqual({
        logoUrl: 'https://storage.example.com/logos/b1/logo-123.png',
        path: 'logos/b1/logo-123.png',
      });
      expect(businessService.findById).toHaveBeenCalledWith('b1');
      expect(businessService.uploadLogo).toHaveBeenCalledWith('b1', mockFile);
    });

    it('should throw BadRequestException when no file uploaded', async () => {
      await expect(
        controller.uploadLogo('b1', 'owner1', null),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when updating another business logo', async () => {
      businessService.findById.mockResolvedValue({ id: 'b1', ownerId: 'other-owner' });

      await expect(
        controller.uploadLogo('b1', 'owner1', mockFile),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadCover', () => {
    const mockFile = {
      buffer: Buffer.from('fake-cover'),
      mimetype: 'image/jpeg',
      originalname: 'cover.jpg',
    };

    it('should upload cover for own business', async () => {
      businessService.findById.mockResolvedValue({ id: 'b1', ownerId: 'owner1' });
      businessService.uploadCover.mockResolvedValue({
        coverUrl: 'https://storage.example.com/covers/b1/cover-456.jpg',
        path: 'covers/b1/cover-456.jpg',
      });

      const result = await controller.uploadCover('b1', 'owner1', mockFile);

      expect(result).toEqual({
        coverUrl: 'https://storage.example.com/covers/b1/cover-456.jpg',
        path: 'covers/b1/cover-456.jpg',
      });
      expect(businessService.findById).toHaveBeenCalledWith('b1');
      expect(businessService.uploadCover).toHaveBeenCalledWith('b1', mockFile);
    });

    it('should throw BadRequestException when no file uploaded', async () => {
      await expect(
        controller.uploadCover('b1', 'owner1', undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when updating another business cover', async () => {
      businessService.findById.mockResolvedValue({ id: 'b1', ownerId: 'other-owner' });

      await expect(
        controller.uploadCover('b1', 'owner1', mockFile),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
