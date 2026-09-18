import { ReviewRequestProcessor } from './review-request.processor';

describe('ReviewRequestProcessor', () => {
  let processor: ReviewRequestProcessor;
  let prisma: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      notification: { findFirst: jest.fn() },
      booking: { findMany: jest.fn() },
    };
    notifications = {
      notifyReviewRequest: jest.fn().mockResolvedValue(undefined),
    };

    processor = new ReviewRequestProcessor(prisma as any, notifications as any);
  });

  afterEach(() => jest.clearAllMocks());

  describe('process', () => {
    it('sends review request when not already sent', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await processor.process('booking-1');

      expect(notifications.notifyReviewRequest).toHaveBeenCalledWith('booking-1');
    });

    it('skips if review request already sent', async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: 'n1', type: 'review-request' });

      await processor.process('booking-1');

      expect(notifications.notifyReviewRequest).not.toHaveBeenCalled();
    });
  });

  describe('processPending', () => {
    it('processes all completed bookings', async () => {
      prisma.booking.findMany.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);
      prisma.notification.findFirst.mockResolvedValue(null);

      const sent = await processor.processPending();

      expect(sent).toBe(2);
      expect(notifications.notifyReviewRequest).toHaveBeenCalledTimes(2);
    });

    it('skips bookings with existing review request', async () => {
      prisma.booking.findMany.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);
      prisma.notification.findFirst
        .mockResolvedValueOnce({ id: 'n1' })
        .mockResolvedValueOnce(null);

      const sent = await processor.processPending();

      expect(sent).toBe(2);
      expect(notifications.notifyReviewRequest).toHaveBeenCalledTimes(1);
      expect(notifications.notifyReviewRequest).toHaveBeenCalledWith('b2');
    });

    it('returns 0 when no completed bookings', async () => {
      prisma.booking.findMany.mockResolvedValue([]);

      const sent = await processor.processPending();

      expect(sent).toBe(0);
      expect(notifications.notifyReviewRequest).not.toHaveBeenCalled();
    });

    it('handles errors gracefully per booking', async () => {
      prisma.booking.findMany.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);
      prisma.notification.findFirst.mockResolvedValue(null);
      notifications.notifyReviewRequest
        .mockRejectedValueOnce(new Error('DB down'))
        .mockResolvedValueOnce(undefined);

      const sent = await processor.processPending();

      expect(sent).toBe(2);
    });
  });
});
