import { Injectable } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';

@Injectable()
export class SlotReconcilerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async reconcileFutureSlots(businessId: string) {
    const template = await this.prisma.availabilityTemplate.findUnique({
      where: { businessId },
    });
    if (!template) return { deleted: 0, orphaned: 0 };

    const weekly = template.weekly as Record<string, string[][]>;
    const today = new Date();
    let deleted = 0;
    let orphaned = 0;

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
      const windows = weekly[dayKey] || [];
      const dateStr = date.toISOString().split('T')[0];

      const allowedStartTimes = new Set<string>();
      if (!template.blackouts.includes(dateStr)) {
        for (const [start, end] of windows) {
          const slots = this.generateSlotsFromWindow(
            start, end,
            template.slotLengthMinutes,
            template.bufferMinutes,
            template.maxParallel,
          );
          for (const slot of slots) {
            allowedStartTimes.add(slot.startTime);
          }
        }
      }

      const existingSlots = await this.prisma.timeSlot.findMany({
        where: { businessId, date },
      });

      for (const slot of existingSlots) {
        if (!allowedStartTimes.has(slot.startTime)) {
          if (slot.currentBookings === 0) {
            await this.prisma.timeSlot.delete({ where: { id: slot.id } });
            deleted++;
          } else {
            orphaned++;
          }
        }
      }
    }

    await this.cache.invalidate(`slots:${businessId}:*`);

    return { deleted, orphaned };
  }

  private generateSlotsFromWindow(
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

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
