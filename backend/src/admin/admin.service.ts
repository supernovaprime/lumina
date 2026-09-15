import { Injectable } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getDashboardMetrics() {
    const cached = await this.cache.get(CacheService.dashboardKey());
    if (cached) return cached;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [bookingsToday, revenueResult, activeBusinesses, pendingVerifications, totalUsers] =
      await Promise.all([
        this.prisma.booking.count({
          where: {
            createdAt: { gte: startOfDay(now), lte: endOfDay(now) },
          },
        }),
        this.prisma.payment.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: monthStart, lte: endOfDay(now) },
          },
          _sum: { amount: true },
        }),
        this.prisma.business.count({
          where: { isActive: true, isVerified: true },
        }),
        this.prisma.business.count({
          where: { verificationStatus: 'PENDING' },
        }),
        this.prisma.user.count({
          where: { isActive: true },
        }),
      ]);

    const metrics = {
      bookingsToday,
      revenueMTD: revenueResult._sum.amount || 0,
      activeBusinesses,
      pendingVerifications,
      totalUsers,
    };

    await this.cache.set(CacheService.dashboardKey(), metrics, 60);

    return metrics;
  }
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
