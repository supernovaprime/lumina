import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      for (const key of keys) {
        await this.redis.del(key);
      }
    }
  }

  // Key builders
  static businessKey(id: string): string {
    return `business:${id}`;
  }

  static slotsKey(businessId: string, date: string): string {
    return `slots:${businessId}:${date}`;
  }

  static searchKey(filters: string): string {
    return `search:${filters}`;
  }

  static dashboardKey(): string {
    return `admin:dashboard`;
  }
}
