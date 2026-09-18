import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';

@Injectable()
export class ReviewRequestProcessor {
  private readonly logger = new Logger(ReviewRequestProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async process(bookingId: string): Promise<void> {
    const existing = await this.prisma.notification.findFirst({
      where: {
        type: 'review-request',
        status: { not: 'FAILED' },
        data: { path: ['bookingId'], equals: bookingId },
      },
    } as any);

    if (existing) {
      this.logger.debug(`Review request already sent for booking ${bookingId}, skipping`);
      return;
    }

    try {
      await this.notifications.notifyReviewRequest(bookingId);
      this.logger.log(`Review request sent for booking ${bookingId}`);
    } catch (err) {
      this.logger.error(`Review request failed for booking ${bookingId}: ${(err as Error).message}`);
    }
  }

  async processPending(): Promise<number> {
    const completed = await this.prisma.booking.findMany({
      where: { status: 'COMPLETED' },
      select: { id: true },
    });

    let sent = 0;
    for (const booking of completed) {
      try {
        await this.process(booking.id);
        sent++;
      } catch (err) {
        this.logger.error(`Review request processing failed for booking ${booking.id}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`Review requests processed: ${sent}/${completed.length}`);
    return sent;
  }
}
