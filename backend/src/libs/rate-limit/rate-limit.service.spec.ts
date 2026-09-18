import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from './rate-limit.service';
import { RedisService } from '../redis/redis.service';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let redis: any;

  beforeEach(async () => {
    redis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
      getClient: jest.fn().mockReturnValue({
        ttl: jest.fn().mockResolvedValue(900),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('recordFailedAttempt', () => {
    it('should record first failed attempt and set TTL', async () => {
      redis.incr.mockResolvedValue(1);

      const result = await service.recordFailedAttempt('test@example.com');

      expect(result.blocked).toBe(false);
      expect(result.attemptsRemaining).toBe(4);
      expect(redis.incr).toHaveBeenCalledWith('login:fail:test@example.com');
      expect(redis.expire).toHaveBeenCalledWith('login:fail:test@example.com', 900);
    });

    it('should increment existing counter', async () => {
      redis.incr.mockResolvedValue(3);

      const result = await service.recordFailedAttempt('test@example.com');

      expect(result.blocked).toBe(false);
      expect(result.attemptsRemaining).toBe(2);
      expect(redis.expire).not.toHaveBeenCalled();
    });

    it('should block after 5 attempts', async () => {
      redis.incr.mockResolvedValue(5);

      const result = await service.recordFailedAttempt('test@example.com');

      expect(result.blocked).toBe(true);
      expect(result.attemptsRemaining).toBe(0);
      expect(result.retryAfterSeconds).toBe(900);
    });

    it('should block on 6th attempt', async () => {
      redis.incr.mockResolvedValue(6);

      const result = await service.recordFailedAttempt('test@example.com');

      expect(result.blocked).toBe(true);
      expect(result.attemptsRemaining).toBe(0);
    });

    it('should normalize email to lowercase', async () => {
      redis.incr.mockResolvedValue(1);

      await service.recordFailedAttempt('Test@Example.COM');

      expect(redis.incr).toHaveBeenCalledWith('login:fail:test@example.com');
    });
  });

  describe('isBlocked', () => {
    it('should return not blocked when no attempts', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.isBlocked('test@example.com');

      expect(result.blocked).toBe(false);
    });

    it('should return not blocked when under limit', async () => {
      redis.get.mockResolvedValue('3');

      const result = await service.isBlocked('test@example.com');

      expect(result.blocked).toBe(false);
    });

    it('should return blocked when at limit', async () => {
      redis.get.mockResolvedValue('5');

      const result = await service.isBlocked('test@example.com');

      expect(result.blocked).toBe(true);
      expect(result.retryAfterSeconds).toBe(900);
    });

    it('should return blocked when over limit', async () => {
      redis.get.mockResolvedValue('10');

      const result = await service.isBlocked('test@example.com');

      expect(result.blocked).toBe(true);
    });
  });

  describe('resetAttempts', () => {
    it('should delete the fail counter', async () => {
      await service.resetAttempts('test@example.com');

      expect(redis.del).toHaveBeenCalledWith('login:fail:test@example.com');
    });

    it('should normalize email to lowercase', async () => {
      await service.resetAttempts('Test@Example.COM');

      expect(redis.del).toHaveBeenCalledWith('login:fail:test@example.com');
    });
  });
});
