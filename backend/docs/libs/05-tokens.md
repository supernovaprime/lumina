# Tokens Service Scaffold

## Purpose
Manages verification tokens and password reset tokens. Single-use, time-limited.
Used by auth module for email verification and password reset flows.

## File: `src/libs/tokens/token.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a verification token for email confirmation.
   * @param userId - User ID
   * @param expiresInHours - Token validity in hours (default 24)
   */
  async createVerificationToken(userId: string, expiresInHours: number = 24): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await this.prisma.verificationToken.create({
      data: { userId, token, expiresAt },
    });

    return token;
  }

  /**
   * Create a password reset token.
   * @param userId - User ID
   * @param expiresInHours - Token validity in hours (default 1)
   */
  async createPasswordResetToken(userId: string, expiresInHours: number = 1): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId, token, expiresAt },
    });

    return token;
  }

  /**
   * Consume a verification token (single-use).
   * Returns userId if valid, null if expired/used/invalid.
   */
  async consumeVerificationToken(token: string): Promise<string | null> {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return null;
    }

    await this.prisma.verificationToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    return record.userId;
  }

  /**
   * Consume a password reset token (single-use).
   * Returns userId if valid, null if expired/used/invalid.
   */
  async consumePasswordResetToken(token: string): Promise<string | null> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return null;
    }

    await this.prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    return record.userId;
  }

  /**
   * Cleanup expired tokens (called by cron).
   */
  async cleanup(): Promise<number> {
    const now = new Date();
    const [vResult, pResult] = await Promise.all([
      this.prisma.verificationToken.deleteMany({
        where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] },
      }),
    ]);
    return vResult.count + pResult.count;
  }
}
```

## File: `src/libs/tokens/token.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
```

## File: `src/libs/tokens/token.service.spec.ts`

Tests:
1. createVerificationToken returns hex string of length 64
2. createVerificationToken stores record in DB
3. consumeVerificationToken returns userId for valid token
4. consumeVerificationToken returns null for expired token
5. consumeVerificationToken returns null for already-used token
6. consumeVerificationToken returns null for invalid token
7. consumePasswordResetToken works same as verification
8. cleanup deletes expired tokens
