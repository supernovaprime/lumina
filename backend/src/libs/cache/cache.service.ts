import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

type MemoryEntry = {
  value: unknown;
  expiresAt: number;
};

const MEMORY_TTL_SECONDS = 5;
const MEMORY_MAX_ENTRIES = 200;

@Injectable()
export class CacheService {
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    const local = this.readMemory<T>(key);
    if (local.found) return local.value;

    const data = await this.redis.get(key);
    if (!data) return null;

    const parsed = JSON.parse(data) as T;
    this.writeMemory(key, parsed, MEMORY_TTL_SECONDS);
    return parsed;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const localTtl =
      Number.isFinite(ttlSeconds) && ttlSeconds > 0
        ? Math.min(ttlSeconds, MEMORY_TTL_SECONDS)
        : MEMORY_TTL_SECONDS;

    this.writeMemory(key, value, localTtl);
    await this.redis.set(key, JSON.stringify(value), ttlSeconds);
  }

  async del(key: string): Promise<void> {
    this.memory.delete(key);
    await this.redis.del(key);
  }

  async invalidate(pattern: string): Promise<void> {
    const matcher = this.patternMatcher(pattern);
    for (const key of this.memory.keys()) {
      if (matcher.test(key)) this.memory.delete(key);
    }

    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      for (const key of keys) {
        await this.redis.del(key);
      }
    }
  }

  private readMemory<T>(key: string): { found: boolean; value: T | null } {
    const entry = this.memory.get(key);
    if (!entry) return { found: false, value: null };

    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return { found: false, value: null };
    }

    this.memory.delete(key);
    this.memory.set(key, entry);
    return { found: true, value: entry.value as T };
  }

  private writeMemory(key: string, value: unknown, ttlSeconds: number): void {
    if (this.memory.size >= MEMORY_MAX_ENTRIES) {
      const oldest = this.memory.keys().next().value as string | undefined;
      if (oldest) this.memory.delete(oldest);
    }

    this.memory.delete(key);
    this.memory.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private patternMatcher(pattern: string): RegExp {
    const escaped = pattern
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*');
    return new RegExp(`^${escaped}$`);
  }

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

  static adminUsersKey(filters: string): string {
    return `admin:users:${filters}`;
  }

  static adminUserKey(id: string): string {
    return `admin:user:${id}`;
  }

  static adminBusinessesKey(filters: string): string {
    return `admin:businesses:${filters}`;
  }

  static adminBusinessKey(id: string): string {
    return `admin:business:${id}`;
  }

  static authUserKey(id: string): string {
    return `auth:user:${id}`;
  }
}
