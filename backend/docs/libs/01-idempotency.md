# Idempotency Service Scaffold

## Purpose
Prevents duplicate mutations on retry. Used by booking create and payment create.
`X-Idempotency-Key: <uuid>` header → store request hash + response → return stored response on duplicate.

## File: `src/libs/idempotency/idempotency.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if key exists for this user. If yes, return stored response.
   * If no, store the key with a 24h TTL and return null (caller should execute).
   * After execution, caller updates the stored response.
   */
  async check(key: string, userId: string): Promise<any | null> {
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { key_userId: { key, userId } },
    });
    if (existing) {
      return existing.response;
    }
    await this.prisma.idempotencyKey.create({
      data: {
        key,
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return null;
  }

  /** After successful execution, store the response. */
  async store(key: string, userId: string, response: any): Promise<void> {
    await this.prisma.idempotencyKey.updateMany({
      where: { key, userId },
      data: { response },
    });
  }

  /** Cleanup expired keys (called by cron). */
  async cleanup(): Promise<number> {
    const { count } = await this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return count;
  }
}
```

## File: `src/libs/idempotency/idempotency.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
```

## File: `src/libs/idempotency/idempotency.service.spec.ts`

Tests:
1. Returns null when key does not exist (first request)
2. Creates IdempotencyKey record with 24h expiry
3. Returns stored response on duplicate key
4. store() updates the response field
5. cleanup() deletes expired keys only
6. cleanup() keeps non-expired keys
