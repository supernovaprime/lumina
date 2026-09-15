import { Injectable } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(customerId: string) {
    return this.prisma.favorite.findMany({
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
