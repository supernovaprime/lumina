import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll(businessId: string, activeOnly = true) {
    return this.prisma.service.findMany({
      where: {
        businessId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: { priceModifiers: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(businessId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        businessId,
        name: dto.name,
        description: dto.description,
        category: dto.category as any,
        basePrice: dto.basePrice,
        durationMinutes: dto.durationMinutes,
      },
    });
  }

  async update(businessId: string, serviceId: string, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, businessId },
    });
    if (!service) throw new NotFoundException('Service not found');

    return this.prisma.service.update({
      where: { id: serviceId },
      data: dto,
    });
  }

  async remove(businessId: string, serviceId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, businessId },
    });
    if (!service) throw new NotFoundException('Service not found');

    const futureBookings = await this.prisma.booking.count({
      where: {
        serviceId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: { gte: new Date() },
      },
    });

    if (futureBookings > 0) {
      throw new ConflictException({
        code: 'HAS_FUTURE_BOOKINGS',
        message: `Cannot delete service with ${futureBookings} future bookings. Cancel or reschedule them first.`,
      });
    }

    return this.prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false },
    });
  }

  async setModifiers(businessId: string, serviceId: string, modifiers: any[]) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, businessId },
    });
    if (!service) throw new NotFoundException('Service not found');

    await this.prisma.$transaction([
      this.prisma.priceModifier.deleteMany({ where: { serviceId } }),
      ...modifiers.map(m =>
        this.prisma.priceModifier.create({
          data: {
            serviceId,
            vehicleType: m.vehicleType,
            vehicleSize: m.vehicleSize,
            multiplier: m.multiplier,
          },
        }),
      ),
    ]);

    return this.prisma.priceModifier.findMany({ where: { serviceId } });
  }
}
