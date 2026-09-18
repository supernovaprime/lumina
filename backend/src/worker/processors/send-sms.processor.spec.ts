import { SendSmsProcessor } from './send-sms.processor';

describe('SendSmsProcessor', () => {
  let processor: SendSmsProcessor;
  let prisma: any;
  let sms: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: { findUnique: jest.fn() },
    };
    sms = { send: jest.fn().mockResolvedValue({ success: true }) };

    processor = new SendSmsProcessor(prisma as any, sms as any);
  });

  afterEach(() => jest.clearAllMocks());

  describe('process', () => {
    it('sends SMS and marks SENT on success', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n1', userId: 'user1', status: 'PENDING', body: 'Your booking is confirmed',
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', phone: '+233240000000' });
      sms.send.mockResolvedValue({ success: true });
      prisma.notification.update.mockResolvedValue({});

      await processor.process('n1');

      expect(sms.send).toHaveBeenCalledWith({ to: '+233240000000', message: 'Your booking is confirmed' });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { status: 'SENT', sentAt: expect.any(Date) },
      });
    });

    it('marks FAILED when SMS send returns failure', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n2', userId: 'user1', status: 'PENDING', body: 'Test',
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', phone: '+233240000000' });
      sms.send.mockResolvedValue({ success: false });
      prisma.notification.update.mockResolvedValue({});

      await processor.process('n2');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n2' },
        data: { status: 'FAILED' },
      });
    });

    it('skips if notification not found', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await processor.process('n999');

      expect(sms.send).not.toHaveBeenCalled();
    });

    it('skips if notification not PENDING', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n3', userId: 'user1', status: 'SENT', body: 'Test',
      });

      await processor.process('n3');

      expect(sms.send).not.toHaveBeenCalled();
    });

    it('skips if user has no phone', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n4', userId: 'user1', status: 'PENDING', body: 'Test',
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', phone: null });

      await processor.process('n4');

      expect(sms.send).not.toHaveBeenCalled();
    });

    it('marks FAILED on exception', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n5', userId: 'user1', status: 'PENDING', body: 'Test',
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', phone: '+233240000000' });
      sms.send.mockRejectedValue(new Error('Network error'));
      prisma.notification.update.mockResolvedValue({});

      await processor.process('n5');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n5' },
        data: { status: 'FAILED' },
      });
    });
  });
});
