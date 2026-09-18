import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { R2Service } from './r2.service';

jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: jest.fn().mockImplementation((input) => input),
    GetObjectCommand: jest.fn().mockImplementation((input) => input),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://r2.example.com/reports/file.csv?signed=abc'),
}));

describe('R2Service', () => {
  let service: R2Service;
  let config: any;

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string, fallback?: string) => {
        const env: Record<string, string> = {
          R2_ACCOUNT_ID: 'test-account',
          R2_ACCESS_KEY_ID: 'test-key',
          R2_SECRET_ACCESS_KEY: 'test-secret',
          R2_BUCKET_NAME: 'test-bucket',
          R2_PUBLIC_URL: 'https://pub.r2.dev',
        };
        return env[key] ?? fallback;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        R2Service,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<R2Service>(R2Service);
  });

  afterEach(() => jest.clearAllMocks());

  describe('upload', () => {
    it('should upload file and return presigned URL', async () => {
      const result = await service.upload('reports/test.csv', 'col1,col2\n1,2', 'text/csv');

      expect(result).toBe('https://r2.example.com/reports/file.csv?signed=abc');
    });

    it('should upload Buffer body', async () => {
      const buffer = Buffer.from('col1,col2\n1,2');
      const result = await service.upload('reports/test.csv', buffer, 'text/csv');

      expect(result).toBe('https://r2.example.com/reports/file.csv?signed=abc');
    });

    it('should throw BadRequestException when R2 not configured', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'R2_ACCOUNT_ID') return '';
        return fallback;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          R2Service,
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const unconfiguredService = module.get<R2Service>(R2Service);

      await expect(
        unconfiguredService.upload('key', 'data', 'text/csv'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPublicUrl', () => {
    it('should return public URL from config', () => {
      const url = service.getPublicUrl('reports/file.csv');
      expect(url).toBe('https://pub.r2.dev/reports/file.csv');
    });

    it('should fallback to default R2.dev URL', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        const env: Record<string, string> = {
          R2_ACCOUNT_ID: 'test-account',
          R2_ACCESS_KEY_ID: 'test-key',
          R2_SECRET_ACCESS_KEY: 'test-secret',
          R2_BUCKET_NAME: 'test-bucket',
        };
        return env[key] ?? fallback;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          R2Service,
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const svc = module.get<R2Service>(R2Service);
      const url = svc.getPublicUrl('reports/file.csv');

      expect(url).toBe('https://test-bucket.r2.dev/reports/file.csv');
    });
  });
});
