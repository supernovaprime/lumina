import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { EmailService } from '../libs/email/email.service';
import { SmsService } from '../libs/sms/sms.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: any;
  let email: any;
  let sms: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      notification: { create: jest.fn(), update: jest.fn() },
      booking: { findUnique: jest.fn() },
    };
    email = { send: jest.fn() };
    sms = { send: jest.fn().mockResolvedValue({ success: true }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
        { provide: SmsService, useValue: sms },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('enqueue', () => {
    it('creates notification record and sends email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@test.com' });
      prisma.notification.create.mockResolvedValue({ id: 'n1' });
      email.send.mockResolvedValue({});
      prisma.notification.update.mockResolvedValue({});

      const result = await service.enqueue('booking-created', 'user1', { businessName: 'Test' });
      expect(result).toBe('n1');
      expect(email.send).toHaveBeenCalled();
    });

    it('returns empty string for missing user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.enqueue('booking-created', 'user999', {});
      expect(result).toBe('');
    });

    it('marks FAILED on email error', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@test.com' });
      prisma.notification.create.mockResolvedValue({ id: 'n1' });
      email.send.mockRejectedValue(new Error('Send failed'));
      prisma.notification.update.mockResolvedValue({});

      await service.enqueue('booking-created', 'user1', { businessName: 'Test' });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { status: 'FAILED' },
      });
    });

    it('sends SMS when channel is SMS', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user1', email: 'test@test.com', phone: '+233240000000',
      });
      prisma.notification.create.mockResolvedValue({ id: 'n2' });
      sms.send.mockResolvedValue({ success: true });
      prisma.notification.update.mockResolvedValue({});

      const result = await service.enqueue('reminder-24h', 'user1', { businessName: 'Test' }, 'SMS');
      expect(result).toBe('n2');
      expect(sms.send).toHaveBeenCalledWith(expect.objectContaining({ to: '+233240000000' }));
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n2' },
        data: { status: 'SENT', sentAt: expect.any(Date) },
      });
    });

    it('marks FAILED when SMS send fails', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user1', email: 'test@test.com', phone: '+233240000000',
      });
      prisma.notification.create.mockResolvedValue({ id: 'n3' });
      sms.send.mockResolvedValue({ success: false });
      prisma.notification.update.mockResolvedValue({});

      await service.enqueue('reminder-24h', 'user1', { businessName: 'Test' }, 'SMS');
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n3' },
        data: { status: 'FAILED' },
      });
    });

    it('marks FAILED when user has no phone for SMS', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user1', email: 'test@test.com', phone: null,
      });
      prisma.notification.create.mockResolvedValue({ id: 'n4' });
      prisma.notification.update.mockResolvedValue({});

      await service.enqueue('reminder-24h', 'user1', { businessName: 'Test' }, 'SMS');
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n4' },
        data: { status: 'FAILED' },
      });
    });
  });

  describe('notifyBookingCreated', () => {
    it('sends to both customer and business owner', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        date: new Date(),
        timeSlot: '10:00',
        customer: { userId: 'cust1', firstName: 'John', lastName: 'Doe' },
        business: { name: 'Test Wash', ownerId: 'owner1' },
        service: { name: 'Basic Wash' },
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@test.com' });
      prisma.notification.create.mockResolvedValue({ id: 'n1' });
      email.send.mockResolvedValue({});
      prisma.notification.update.mockResolvedValue({});

      await service.notifyBookingCreated('b1');
      expect(email.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTemplate', () => {
    it('returns correct template for each type', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@test.com' });
      prisma.notification.create.mockResolvedValue({ id: 'n1' });
      email.send.mockResolvedValue({});
      prisma.notification.update.mockResolvedValue({});

      const types = [
        'booking-created', 'payment-succeeded', 'booking-confirmed',
        'booking-cancelled', 'reminder-24h', 'reminder-2h',
        'review-request', 'business-approved', 'refund-processed',
      ] as const;

      for (const type of types) {
        await service.enqueue(type, 'user1', { businessName: 'Test', serviceName: 'Wash' });
      }
      expect(email.send).toHaveBeenCalledTimes(9);
    });
  });
});
