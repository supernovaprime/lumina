import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async check(key: string, userId: string): Promise<any | null> {
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { key },
    });
    if (existing && existing.userId === userId) {
      return existing.response;
    }
    if (existing) {
      return null;
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

  async store(key: string, userId: string, response: any): Promise<void> {
    await this.prisma.idempotencyKey.updateMany({
      where: { key, userId },
      data: { response },
    });
  }

  async cleanup(): Promise<number> {
    const { count } = await this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return count;
  }
}
