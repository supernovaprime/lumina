import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let config: any;

  const mockSupabaseUrl = 'https://test.supabase.co';
  const mockSupabaseKey = 'test-anon-key';
  const mockBucket = 'lumina';

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string, fallback?: string) => {
        const env: Record<string, string> = {
          SUPABASE_URL: mockSupabaseUrl,
          SUPABASE_ANON_KEY: mockSupabaseKey,
          STORAGE_BUCKET: mockBucket,
        };
        return env[key] ?? fallback;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('upload', () => {
    it('should upload file and return path + publicUrl', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ Key: 'logos/b1/logo-123.png' }), { status: 200 }),
      );

      const buffer = Buffer.from('fake-image-data');
      const result = await service.upload('logos/b1', 'logo-123.png', buffer, 'image/png');

      expect(result).toEqual({
        path: 'logos/b1/logo-123.png',
        publicUrl: `${mockSupabaseUrl}/storage/v1/object/public/${mockBucket}/logos/b1/logo-123.png`,
      });
      expect(fetchSpy).toHaveBeenCalledWith(
        `${mockSupabaseUrl}/storage/v1/object/${mockBucket}/logos/b1/logo-123.png`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            apikey: mockSupabaseKey,
            'Content-Type': 'image/png',
            'x-upsert': 'true',
          }),
        }),
      );
    });

    it('should throw BadRequestException on upload failure', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response('Storage error', { status: 413 }),
      );

      await expect(
        service.upload('logos/b1', 'logo.png', Buffer.from('data'), 'image/png'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when storage not configured', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'SUPABASE_URL') return '';
        const env: Record<string, string> = {
          SUPABASE_ANON_KEY: mockSupabaseKey,
          STORAGE_BUCKET: mockBucket,
        };
        return env[key] ?? fallback;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageService,
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const unconfiguredService = module.get<StorageService>(StorageService);

      await expect(
        unconfiguredService.upload('logos/b1', 'logo.png', Buffer.from('data'), 'image/png'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete file without error', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(null, { status: 200 }),
      );

      await service.delete('logos/b1/old-logo.png');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${mockSupabaseUrl}/storage/v1/object/${mockBucket}/logos/b1/old-logo.png`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('should not throw on delete failure', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response('Not found', { status: 404 }),
      );

      await expect(service.delete('logos/b1/missing.png')).resolves.toBeUndefined();
    });

    it('should silently skip when storage not configured', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'SUPABASE_URL') return '';
        return fallback;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageService,
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const unconfiguredService = module.get<StorageService>(StorageService);

      const fetchSpy = jest.spyOn(global, 'fetch');
      await unconfiguredService.delete('logos/b1/old-logo.png');

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('getPublicUrl', () => {
    it('should return correct public URL', () => {
      const url = service.getPublicUrl('logos/b1/logo.png');

      expect(url).toBe(
        `${mockSupabaseUrl}/storage/v1/object/public/${mockBucket}/logos/b1/logo.png`,
      );
    });

    it('should handle nested paths', () => {
      const url = service.getPublicUrl('covers/b1/subfolder/cover.jpg');

      expect(url).toBe(
        `${mockSupabaseUrl}/storage/v1/object/public/${mockBucket}/covers/b1/subfolder/cover.jpg`,
      );
    });
  });
});
