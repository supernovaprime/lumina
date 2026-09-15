import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  async createVerificationToken(userId: string, expiresInHours: number = 24): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await this.prisma.verificationToken.create({
      data: { userId, token, expiresAt },
    });

    return token;
  }

  async createPasswordResetToken(userId: string, expiresInHours: number = 1): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId, token, expiresAt },
    });

    return token;
  }

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
