import { Test, TestingModule } from '@nestjs/testing';
import { SendRemindersProcessor } from './send-reminders.processor';
import { NotificationService } from '../../notification/notification.service';

describe('SendRemindersProcessor', () => {
  let processor: SendRemindersProcessor;
  let prisma: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      booking: { findMany: jest.fn().mockResolvedValue([]) },
    };
    notifications = {
      enqueue: jest.fn().mockResolvedValue('notif-1'),
    };

    processor = new SendRemindersProcessor(prisma as any, notifications as any);
  });

  afterEach(() => jest.clearAllMocks());

  describe('process', () => {
    it('returns 0 counts when no bookings need reminders', async () => {
      const result = await processor.process();
      expect(result.sent24h).toBe(0);
      expect(result.sent2h).toBe(0);
      expect(prisma.booking.findMany).toHaveBeenCalledTimes(2);
    });

    it('sends 24h reminders for bookings in window', async () => {
      const booking = {
        id: 'b1',
        customerId: 'user1',
        business: { name: 'Wash Co' },
        service: { name: 'Basic Wash' },
        date: new Date(),
      };

      prisma.booking.findMany.mockResolvedValue([booking]);

      const result = await processor.process();
      expect(result.sent24h).toBe(1);
      expect(notifications.enqueue).toHaveBeenCalledWith(
        'reminder-24h',
        'user1',
        expect.objectContaining({ bookingId: 'b1' }),
      );
    });

    it('sends 2h reminders for bookings in window', async () => {
      const booking = {
        id: 'b2',
        customerId: 'user2',
        business: { name: 'Quick Wash' },
        service: { name: 'Express Wash' },
        date: new Date(),
      };

      prisma.booking.findMany.mockResolvedValue([booking]);

      const result = await processor.process();
      expect(result.sent2h).toBe(1);
      expect(notifications.enqueue).toHaveBeenCalledWith(
        'reminder-2h',
        'user2',
        expect.objectContaining({ bookingId: 'b2' }),
      );
    });

    it('skips bookings without customerId', async () => {
      const booking = {
        id: 'b3',
        customerId: null,
        business: { name: 'Wash Co' },
        service: { name: 'Basic Wash' },
        date: new Date(),
      };

      prisma.booking.findMany.mockResolvedValue([booking]);

      const result = await processor.process();
      expect(result.sent24h).toBe(0);
      expect(result.sent2h).toBe(0);
      expect(notifications.enqueue).not.toHaveBeenCalled();
    });

    it('handles enqueue errors gracefully', async () => {
      const booking = {
        id: 'b4',
        customerId: 'user1',
        business: { name: 'Wash Co' },
        service: { name: 'Basic Wash' },
        date: new Date(),
      };

      prisma.booking.findMany.mockResolvedValue([booking]);
      notifications.enqueue.mockRejectedValue(new Error('DB down'));

      const result = await processor.process();
      expect(result.sent24h).toBe(0);
    });
  });
});
