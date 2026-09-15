import { Logger } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';

export class BookingHoldExpiryProcessor {
  private readonly logger = new Logger(BookingHoldExpiryProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(): Promise<void> {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);

    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
      },
      include: { timeSlot_rel: true },
    });

    for (const booking of expiredBookings) {
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

          if (booking.timeSlot_rel) {
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
      } catch (err) {
        this.logger.error(`Failed to expire booking ${booking.id}: ${(err as Error).message}`);
      }
    }
  }
}
