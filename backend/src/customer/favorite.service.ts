import { Injectable } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(customerId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { customerId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            rating: true,
            reviewCount: true,
            logo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enriched = await Promise.all(
      favorites.map(async (fav) => {
        const nextSlot = await this.prisma.timeSlot.findFirst({
          where: {
            businessId: fav.businessId,
            date: { gte: today },
            isAvailable: true,
            currentBookings: { lt: 10 },
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });

        return {
          ...fav,
          nextAvailableSlot: nextSlot
            ? { date: nextSlot.date, startTime: nextSlot.startTime, endTime: nextSlot.endTime }
            : null,
        };
      }),
    );

    return enriched;
  }

  async add(customerId: string, businessId: string) {
    const favorite = await this.prisma.favorite.upsert({
      where: {
        customerId_businessId: { customerId, businessId },
      },
      update: {},
      create: { customerId, businessId },
      include: { business: true },
    });

    return favorite;
  }

  async remove(customerId: string, businessId: string) {
    await this.prisma.favorite.deleteMany({
      where: { customerId, businessId },
    });

    return { message: 'Favorite removed' };
  }
}
