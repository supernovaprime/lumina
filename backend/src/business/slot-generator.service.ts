import { Injectable } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';

@Injectable()
export class SlotGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async generateSlots(businessId: string, horizonDays: number = 30) {
    const template = await this.prisma.availabilityTemplate.findUnique({
      where: { businessId },
    });
    if (!template) return;

    const weekly = template.weekly as Record<string, string[][]>;
    const today = new Date();
    let created = 0;

    for (let i = 0; i < horizonDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
      const windows = weekly[dayKey] || [];

      const dateStr = date.toISOString().split('T')[0];
      if (template.blackouts.includes(dateStr)) continue;

      for (const [start, end] of windows) {
        const slots = this.generateSlotsFromWindow(
          start, end,
          template.slotLengthMinutes,
          template.bufferMinutes,
          template.maxParallel,
        );

        for (const slot of slots) {
          const existing = await this.prisma.timeSlot.findUnique({
            where: {
              businessId_date_startTime: {
                businessId,
                date,
                startTime: slot.startTime,
              },
            },
          });

          if (!existing) {
            await this.prisma.timeSlot.create({
              data: {
                businessId,
                date,
                startTime: slot.startTime,
                endTime: slot.endTime,
                maxBookings: template.maxParallel,
                currentBookings: 0,
                isAvailable: true,
              },
            });
            created++;
          }
        }
      }
    }

    await this.cache.invalidate(`slots:${businessId}:*`);

    return { created, horizonDays };
  }

  generateSlotsFromWindow(
    start: string,
    end: string,
    slotLength: number,
    buffer: number,
    maxParallel: number,
  ) {
    const slots: { startTime: string; endTime: string }[] = [];
    let current = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);

    while (current + slotLength <= endMinutes) {
      slots.push({
        startTime: this.minutesToTime(current),
        endTime: this.minutesToTime(current + slotLength),
      });
      current += slotLength + buffer;
    }

    return slots;
  }

  timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
