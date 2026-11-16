import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { SlotGeneratorService } from './slot-generator.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly slotGenerator: SlotGeneratorService,
  ) {}

  async getTemplate(businessId: string) {
    const template = await this.prisma.availabilityTemplate.findUnique({
      where: { businessId },
    });
    if (!template)
      throw new NotFoundException('No availability template found');
    return template;
  }

  async updateTemplate(businessId: string, dto: UpdateAvailabilityDto) {
    this.validateTemplate(dto);

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

    await this.slotGenerator.generateSlots(businessId, 30);

    return template;
  }

  async getSlots(businessId: string, dateStr: string, serviceId?: string) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    if (date < today || date > maxDate) {
      throw new BadRequestException('Date must be within the next 30 days');
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { isVerified: true, isActive: true },
    });

    if (!business || !business.isActive || !business.isVerified) {
      throw new NotFoundException('Business not found');
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
        select: { durationMinutes: true },
      });
      if (service) {
        filteredSlots = slots.filter((slot) => {
          const slotMinutes =
            this.timeToMinutes(slot.endTime) -
            this.timeToMinutes(slot.startTime);
          return slotMinutes >= service.durationMinutes;
        });
      }
    }

    const result = {
      date: dateStr,
      businessId,
      slots: filteredSlots.map((s) => ({
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

  private validateTemplate(dto: UpdateAvailabilityDto) {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    for (const day of days) {
      const windows = dto.weekly[day] || [];
      for (const [start, end] of windows) {
        const startMin = this.timeToMinutes(start);
        const endMin = this.timeToMinutes(end);

        if (startMin >= endMin) {
          throw new BadRequestException(
            `Invalid time window for ${day}: start must be before end`,
          );
        }

        const windowLength = endMin - startMin;
        if (dto.slotLengthMinutes > windowLength) {
          throw new BadRequestException(
            `Slot length (${dto.slotLengthMinutes}min) exceeds window length (${windowLength}min) for ${day}`,
          );
        }

        if (
          windowLength % (dto.slotLengthMinutes + dto.bufferMinutes) !== 0 &&
          windowLength < dto.slotLengthMinutes
        ) {
          // Not an exact divide, but that's OK — trailing time is unused
        }
      }
    }
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
