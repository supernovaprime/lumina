import { Logger } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { BookingHoldExpiryProcessor } from './booking-hold-expiry.processor';

export class SendRemindersProcessor {
  private readonly logger = new Logger(SendRemindersProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(): Promise<void> {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowStart = new Date(in24h.getTime() - 15 * 60 * 1000);
    const windowEnd = new Date(in24h.getTime() + 15 * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        date: { gte: windowStart, lte: windowEnd },
      },
    });

    this.logger.log(`Found ${bookings.length} bookings needing reminders`);
  }
}
