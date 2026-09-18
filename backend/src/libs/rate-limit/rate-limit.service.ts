import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60; // 15 minutes

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly redis: RedisService) {}

  private failKey(email: string): string {
    return `login:fail:${email.toLowerCase()}`;
  }

  async recordFailedAttempt(email: string): Promise<{ blocked: boolean; attemptsRemaining: number; retryAfterSeconds?: number }> {
    const key = this.failKey(email);
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, LOCKOUT_SECONDS);
    }

    if (current >= MAX_ATTEMPTS) {
      const ttl = await this.getRemainingTtl(key);
      this.logger.warn(`Login blocked for ${email}: ${current} failures, retry after ${ttl}s`);
      return {
        blocked: true,
        attemptsRemaining: 0,
        retryAfterSeconds: ttl,
      };
    }

    return {
      blocked: false,
      attemptsRemaining: MAX_ATTEMPTS - current,
    };
  }

  async isBlocked(email: string): Promise<{ blocked: boolean; retryAfterSeconds?: number }> {
    const key = this.failKey(email);
    const count = await this.redis.get(key);

    if (!count) return { blocked: false };

    const attempts = parseInt(count, 10);
    if (attempts >= MAX_ATTEMPTS) {
      const ttl = await this.getRemainingTtl(key);
      return { blocked: true, retryAfterSeconds: ttl };
    }

    return { blocked: false };
  }

  async resetAttempts(email: string): Promise<void> {
    await this.redis.del(this.failKey(email));
  }

  private async getRemainingTtl(key: string): Promise<number> {
    const client = this.redis.getClient();
    if (!client) return LOCKOUT_SECONDS;
    try {
      const ttl = await client.ttl(key);
      return ttl > 0 ? ttl : LOCKOUT_SECONDS;
    } catch {
      return LOCKOUT_SECONDS;
    }
  }
}
