import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getTemplate(businessId: string) {
    const template = await this.prisma.availabilityTemplate.findUnique({
      where: { businessId },
    });
    if (!template) throw new NotFoundException('No availability template found');
    return template;
  }

  async updateTemplate(businessId: string, dto: UpdateAvailabilityDto) {
    const template = await this.prisma.availabilityTemplate.upsert({
      where: { businessId },
      update: {
        slotLengthMinutes: dto.slotLengthMinutes,
        bufferMinutes: dto.bufferMinutes,
        maxParallel: dto.maxParallel,
        weekly: dto.weekly,
        blackouts: dto.blackouts,
      },
      create: {
        businessId,
        slotLengthMinutes: dto.slotLengthMinutes,
        bufferMinutes: dto.bufferMinutes,
        maxParallel: dto.maxParallel,
        weekly: dto.weekly,
        blackouts: dto.blackouts,
      },
    });

    await this.cache.invalidate(`slots:${businessId}:*`);

    return template;
  }

  async getSlots(businessId: string, dateStr: string, serviceId?: string) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const cacheKey = `slots:${businessId}:${dateStr}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const where: any = {
      businessId,
      date,
      isAvailable: true,
    };

    const slots = await this.prisma.timeSlot.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });

    let filteredSlots = slots;
    if (serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
      });
      if (service) {
        filteredSlots = slots.filter(slot => {
          const slotMinutes = this.timeToMinutes(slot.endTime) - this.timeToMinutes(slot.startTime);
          return slotMinutes >= service.durationMinutes;
        });
      }
    }

    const result = {
      date: dateStr,
      businessId,
      slots: filteredSlots.map(s => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        remaining: s.maxBookings - s.currentBookings,
        isAvailable: s.isAvailable && s.currentBookings < s.maxBookings,
      })),
    };

    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
