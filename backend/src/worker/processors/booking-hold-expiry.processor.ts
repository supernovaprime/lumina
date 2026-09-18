import { Logger } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';

export class BookingHoldExpiryProcessor {
  private readonly logger = new Logger(BookingHoldExpiryProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(): Promise<void> {
    if (!this.prisma?.booking) {
      this.logger.warn('Prisma booking model unavailable — skipping hold expiry');
      return;
    }

    const cutoff = new Date(Date.now() - 15 * 60 * 1000);

    let expiredBookings: any[];
    try {
      expiredBookings = await this.prisma.booking.findMany({
        where: {
          status: 'PENDING',
          createdAt: { lt: cutoff },
        },
        include: { timeSlot_rel: true },
      });
    } catch (err: any) {
      this.logger.error(`Hold expiry query failed: ${err?.message ?? err}`, err?.stack);
      return;
    }

    if (!expiredBookings?.length) return;

    this.logger.log(`Found ${expiredBookings.length} expired hold(s) to cancel`);

    for (const booking of expiredBookings) {
      if (!booking?.id) {
        this.logger.warn('Skipping undefined booking entry in hold expiry');
        continue;
      }
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancelledBy: 'SYSTEM',
              cancelReason: 'PAYMENT_TIMEOUT',
            },
          });

          if (booking.timeSlot_rel && booking.timeSlotId) {
            await tx.timeSlot.update({
              where: { id: booking.timeSlotId },
              data: {
                currentBookings: { decrement: 1 },
                isAvailable: true,
              },
            });
          }
        });

        this.logger.log(`Expired booking ${booking.id} cancelled`);
      } catch (err: any) {
        this.logger.error(
          `Failed to expire booking ${booking.id}: ${err?.message ?? err}`,
          err?.stack,
        );
      }
    }
  }
}
