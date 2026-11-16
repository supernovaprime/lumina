import { Injectable } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(customerId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { customerId },
      relationLoadStrategy: 'join',
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

    const businessIds = favorites.map((favorite) => favorite.businessId);
    const nextSlots = businessIds.length
      ? await this.prisma.timeSlot.findMany({
          where: {
            businessId: { in: businessIds },
            date: { gte: today },
            isAvailable: true,
            currentBookings: { lt: 10 },
          },
          select: {
            businessId: true,
            date: true,
            startTime: true,
            endTime: true,
          },
          orderBy: [
            { businessId: 'asc' },
            { date: 'asc' },
            { startTime: 'asc' },
          ],
        })
      : [];

    const nextSlotByBusiness = new Map<string, (typeof nextSlots)[number]>();
    for (const slot of nextSlots) {
      if (!nextSlotByBusiness.has(slot.businessId)) {
        nextSlotByBusiness.set(slot.businessId, slot);
      }
    }

    return favorites.map((favorite) => {
      const nextSlot = nextSlotByBusiness.get(favorite.businessId);
      return {
        ...favorite,
        nextAvailableSlot: nextSlot
          ? {
              date: nextSlot.date,
              startTime: nextSlot.startTime,
              endTime: nextSlot.endTime,
            }
          : null,
      };
    });
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
