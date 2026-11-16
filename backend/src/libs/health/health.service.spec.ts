import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('HealthService', () => {
  let service: HealthService;

  const mockPrisma = {
    $queryRawUnsafe: jest.fn(),
    retryOnTransientError: jest.fn((fn: () => Promise<unknown>) => fn()),
  };

  const mockRedis = {
    getClient: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string, fallback?: string) => {
      const env: Record<string, string> = {
        MAILGUN_API_KEY: 'key-xxx',
        MAILGUN_DOMAIN: 'mg.example.com',
        MNOTIFY_API_KEY: 'test-key',
        STRIPE_SECRET_KEY: 'sk_test_123',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        STORAGE_BUCKET: 'my-bucket',
        SENTRY_DSN: 'https://dsn@sentry.io/123',
        GEOCODING_USER_AGENT: 'TestAgent',
        JWT_SECRET: 'real-secret-not-placeholder',
        REDIS_URL: '',
      };
      return env[key] ?? fallback ?? '';
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkPostgres', () => {
    it('should return healthy when query succeeds', async () => {
      const result = await service.checkPostgres();
      expect(result.status).toBe('healthy');
      expect(result.name).toBe('PostgreSQL');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return down when query fails', async () => {
      mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await service.checkPostgres();
      expect(result.status).toBe('down');
      expect(result.message).toContain('ECONNREFUSED');
    });
  });

  describe('checkRedis', () => {
    it('should return not_configured when client is null', async () => {
      mockRedis.getClient.mockReturnValue(null);
      const result = await service.checkRedis();
      expect(result.status).toBe('not_configured');
    });

    it('should return healthy when ping returns PONG', async () => {
      mockRedis.getClient.mockReturnValue({ ping: jest.fn().mockResolvedValue('PONG') });
      const result = await service.checkRedis();
      expect(result.status).toBe('healthy');
    });

    it('should return down when ping throws', async () => {
      mockRedis.getClient.mockReturnValue({
        ping: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      });
      const result = await service.checkRedis();
      expect(result.status).toBe('down');
    });
  });

  describe('config checks', () => {
    it('checkMailgun should return healthy when configured', () => {
      expect(service.checkMailgun().status).toBe('healthy');
    });

    it('checkMNotify should return healthy when configured', () => {
      expect(service.checkMNotify().status).toBe('healthy');
    });

    it('checkStripe should return healthy when configured', () => {
      const result = service.checkStripe();
      expect(result.status).toBe('healthy');
      expect(result.message).toContain('test');
    });

    it('checkSupabaseStorage should return healthy when configured', () => {
      expect(service.checkSupabaseStorage().status).toBe('healthy');
    });

    it('checkSentry should return healthy when configured', () => {
      expect(service.checkSentry().status).toBe('healthy');
    });

    it('checkGeocoding should return healthy when configured', () => {
      expect(service.checkGeocoding().status).toBe('healthy');
    });

    it('checkJwt should return healthy with real secret', () => {
      expect(service.checkJwt().status).toBe('healthy');
    });

    it('checkJwt should return degraded with placeholder', async () => {
      mockConfig.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'JWT_SECRET') return '[YOUR-JWT-SECRET]';
        return fallback ?? '';
      });
      expect(service.checkJwt().status).toBe('degraded');
    });
  });

  describe('checkAll', () => {
    it('should return overall ok when all services healthy', async () => {
      mockConfig.get.mockImplementation((key: string, fallback?: string) => {
        const env: Record<string, string> = {
          MAILGUN_API_KEY: 'key-xxx',
          MAILGUN_DOMAIN: 'mg.example.com',
          MNOTIFY_API_KEY: 'test-key',
          STRIPE_SECRET_KEY: 'sk_test_123',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_ANON_KEY: 'anon-key',
          STORAGE_BUCKET: 'my-bucket',
          SENTRY_DSN: 'https://dsn@sentry.io/123',
          GEOCODING_USER_AGENT: 'TestAgent',
          JWT_SECRET: 'real-secret-not-placeholder',
        };
        return env[key] ?? fallback ?? '';
      });
      mockRedis.getClient.mockReturnValue({ ping: jest.fn().mockResolvedValue('PONG') });
      const report = await service.checkAll();
      expect(report.status).toBe('ok');
      expect(report.services.length).toBe(9);
      expect(report.timestamp).toBeDefined();
      expect(report.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return overall down when postgres is down', async () => {
      mockConfig.get.mockImplementation((key: string, fallback?: string) => {
        const env: Record<string, string> = {
          MAILGUN_API_KEY: 'key-xxx',
          MAILGUN_DOMAIN: 'mg.example.com',
          MNOTIFY_API_KEY: 'test-key',
          STRIPE_SECRET_KEY: 'sk_test_123',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_ANON_KEY: 'anon-key',
          STORAGE_BUCKET: 'my-bucket',
          SENTRY_DSN: 'https://dsn@sentry.io/123',
          GEOCODING_USER_AGENT: 'TestAgent',
          JWT_SECRET: 'real-secret-not-placeholder',
        };
        return env[key] ?? fallback ?? '';
      });
      mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('DB down'));
      mockRedis.getClient.mockReturnValue({ ping: jest.fn().mockResolvedValue('PONG') });
      const report = await service.checkAll();
      expect(report.status).toBe('down');
    });

    it('should return overall degraded when jwt is placeholder', async () => {
      mockConfig.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'JWT_SECRET') return '[YOUR-JWT-SECRET]';
        const env: Record<string, string> = {
          MAILGUN_API_KEY: 'key-xxx',
          MAILGUN_DOMAIN: 'mg.example.com',
          MNOTIFY_API_KEY: 'test-key',
          STRIPE_SECRET_KEY: 'sk_test_123',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_ANON_KEY: 'anon-key',
          STORAGE_BUCKET: 'my-bucket',
          SENTRY_DSN: 'https://dsn@sentry.io/123',
          GEOCODING_USER_AGENT: 'TestAgent',
        };
        return env[key] ?? fallback ?? '';
      });
      mockRedis.getClient.mockReturnValue({ ping: jest.fn().mockResolvedValue('PONG') });
      const report = await service.checkAll();
      expect(report.status).toBe('degraded');
    });
  });
});
