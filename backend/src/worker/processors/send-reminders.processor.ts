import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';

@Injectable()
export class SendRemindersProcessor {
  private readonly logger = new Logger(SendRemindersProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async process(): Promise<{ sent24h: number; sent2h: number }> {
    const now = new Date();
    let sent24h = 0;
    let sent2h = 0;

    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const window24hStart = new Date(in24h.getTime() - 15 * 60 * 1000);
    const window24hEnd = new Date(in24h.getTime() + 15 * 60 * 1000);

    const bookings24h = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        date: { gte: window24hStart, lte: window24hEnd },
      },
      select: {
        id: true,
        customerId: true,
        date: true,
        business: { select: { name: true } },
        service: { select: { name: true } },
      },
      relationLoadStrategy: 'join',
    });

    for (const booking of bookings24h) {
      try {
        if (booking.customerId) {
          await this.notifications.enqueue('reminder-24h', booking.customerId, {
            bookingId: booking.id,
            businessName: booking.business?.name ?? '',
            serviceName: booking.service?.name ?? '',
            date: booking.date,
          });
          sent24h++;
        }
      } catch (err) {
        this.logger.error(
          `24h reminder failed for booking ${booking.id}: ${(err as Error).message}`,
        );
      }
    }

    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const window2hStart = new Date(in2h.getTime() - 15 * 60 * 1000);
    const window2hEnd = new Date(in2h.getTime() + 15 * 60 * 1000);

    const bookings2h = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        date: { gte: window2hStart, lte: window2hEnd },
      },
      select: {
        id: true,
        customerId: true,
        date: true,
        business: { select: { name: true } },
        service: { select: { name: true } },
      },
      relationLoadStrategy: 'join',
    });

    for (const booking of bookings2h) {
      try {
        if (booking.customerId) {
          await this.notifications.enqueue('reminder-2h', booking.customerId, {
            bookingId: booking.id,
            businessName: booking.business?.name ?? '',
            serviceName: booking.service?.name ?? '',
            date: booking.date,
          });
          sent2h++;
        }
      } catch (err) {
        this.logger.error(
          `2h reminder failed for booking ${booking.id}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`Reminders sent: ${sent24h} (24h), ${sent2h} (2h)`);
    return { sent24h, sent2h };
  }
}
