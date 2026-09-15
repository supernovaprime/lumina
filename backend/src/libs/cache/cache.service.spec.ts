import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { RedisService } from '../redis/redis.service';

describe('CacheService', () => {
  let service: CacheService;
  let redis: any;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('get', () => {
    it('should return parsed JSON from redis', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }));

      const result = await service.get('key1');

      expect(result).toEqual({ foo: 'bar' });
      expect(redis.get).toHaveBeenCalledWith('key1');
    });

    it('should return null if key not found', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null for empty string', async () => {
      redis.get.mockResolvedValue('');

      const result = await service.get('empty');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should serialize and store value with TTL', async () => {
      redis.set.mockResolvedValue('OK');

      await service.set('key1', { data: 123 }, 60);

      expect(redis.set).toHaveBeenCalledWith('key1', '{"data":123}', 60);
    });

    it('should store value without TTL if not provided', async () => {
      redis.set.mockResolvedValue('OK');

      await service.set('key1', 'value', undefined as any);

      expect(redis.set).toHaveBeenCalledWith('key1', '"value"', undefined);
    });
  });

  describe('del', () => {
    it('should delete key from redis', async () => {
      redis.del.mockResolvedValue(1);

      await service.del('key1');

      expect(redis.del).toHaveBeenCalledWith('key1');
    });
  });

  describe('invalidate', () => {
    it('should delete all matching keys', async () => {
      redis.keys.mockResolvedValue(['key1', 'key2', 'key3']);
      redis.del.mockResolvedValue(1);

      await service.invalidate('prefix:*');

      expect(redis.keys).toHaveBeenCalledWith('prefix:*');
      expect(redis.del).toHaveBeenCalledTimes(3);
    });

    it('should do nothing if no keys match', async () => {
      redis.keys.mockResolvedValue([]);

      await service.invalidate('nonexistent:*');

      expect(redis.del).not.toHaveBeenCalled();
    });
  });

  describe('key builders', () => {
    it('businessKey should return correct format', () => {
      expect(CacheService.businessKey('123')).toBe('business:123');
    });

    it('slotsKey should return correct format', () => {
      expect(CacheService.slotsKey('biz-1', '2026-09-14')).toBe('slots:biz-1:2026-09-14');
    });

    it('searchKey should return correct format', () => {
      expect(CacheService.searchKey('car+wash')).toBe('search:car+wash');
    });

    it('dashboardKey should return correct format', () => {
      expect(CacheService.dashboardKey()).toBe('admin:dashboard');
    });
  });
});
