import { Logger } from '@nestjs/common';
import { NotificationService } from '../../notification/notification.service';

export class ReviewRequestProcessor {
  private readonly logger = new Logger(ReviewRequestProcessor.name);

  constructor(private readonly notifications: NotificationService) {}

  async process(bookingId: string): Promise<void> {
    try {
      await this.notifications.notifyReviewRequest(bookingId);
      this.logger.log(`Review request sent for booking ${bookingId}`);
    } catch (err) {
      this.logger.error(`Review request failed for booking ${bookingId}: ${(err as Error).message}`);
    }
  }
}
