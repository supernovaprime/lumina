import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { MoneyService } from '../libs/money/money.service';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: any;
  let money: any;
  let config: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      booking: { findUnique: jest.fn(), update: jest.fn() },
      payment: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      refund: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
    } as any;
    money = {
      toCents: jest.fn((d: Decimal) => Math.round(Number(d) * 100)),
      toDecimal: jest.fn((c: number) => new Decimal(c / 100)),
    };
    config = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const configMap: Record<string, string> = { STRIPE_SECRET_KEY: '' };
        return configMap[key] ?? defaultValue;
      }),
    };
    notifications = {
      enqueue: jest.fn().mockResolvedValue('n1'),
      notifyPaymentSucceeded: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: prisma },
        { provide: MoneyService, useValue: money },
        { provide: ConfigService, useValue: config },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createPayment', () => {
    it('succeeds for cash payment', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1', customerId: 'user1', status: 'PENDING', totalPrice: new Decimal(50),
      });
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.payment.create.mockResolvedValue({ id: 'p1', status: 'COMPLETED', amount: new Decimal(50) });
        prisma.booking.update.mockResolvedValue({});
        return fn(prisma);
      });

      const result = await service.createPayment('user1', { bookingId: 'b1', method: 'CASH' });
      expect(result.status).toBe('COMPLETED');
      expect(result.clientSecret).toBeUndefined();
    });

    it('succeeds for card payment without Stripe (returns PROCESSING)', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1', customerId: 'user1', status: 'PENDING', totalPrice: new Decimal(50),
      });
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.payment.create.mockResolvedValue({ id: 'p1', status: 'PROCESSING', amount: new Decimal(50) });
        return fn(prisma);
      });

      const result = await service.createPayment('user1', { bookingId: 'b1', method: 'CARD' });
      expect(result.status).toBe('PROCESSING');
    });

    it('throws NotFoundException for non-owned booking', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.createPayment('user1', { bookingId: 'b1', method: 'CASH' })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for non-pending booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1', customerId: 'user1', status: 'CONFIRMED', totalPrice: new Decimal(50),
      });
      prisma.payment.findFirst.mockResolvedValue(null);
      await expect(service.createPayment('user1', { bookingId: 'b1', method: 'CASH' })).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException for duplicate payment', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1', customerId: 'user1', status: 'PENDING', totalPrice: new Decimal(50),
      });
      prisma.payment.findFirst.mockResolvedValue({ id: 'p1', status: 'COMPLETED' });
      await expect(service.createPayment('user1', { bookingId: 'b1', method: 'CASH' })).rejects.toThrow(ConflictException);
    });
  });

  describe('refund', () => {
    it('succeeds for full refund', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p1', status: 'COMPLETED', amount: new Decimal(50), bookingId: 'b1', transactionId: null,
      });
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.refund.create.mockResolvedValue({ id: 'r1', status: 'COMPLETED' });
        prisma.payment.update.mockResolvedValue({});
        prisma.booking.update.mockResolvedValue({});
        prisma.auditLog.create.mockResolvedValue({});
        return fn(prisma);
      });

      const result = await service.refund('p1', { reason: 'Customer request' }, 'admin1');
      expect(result.status).toBe('COMPLETED');
      expect(result.amount).toBe(5000);
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(notifications.enqueue).toHaveBeenCalled();
    });

    it('succeeds for partial refund', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p1', status: 'COMPLETED', amount: new Decimal(50), bookingId: 'b1', transactionId: null,
      });
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.refund.create.mockResolvedValue({ id: 'r1', status: 'COMPLETED' });
        prisma.payment.update.mockResolvedValue({});
        prisma.booking.update.mockResolvedValue({});
        prisma.auditLog.create.mockResolvedValue({});
        return fn(prisma);
      });

      const result = await service.refund('p1', { amountCents: 2500, reason: 'Partial issue' }, 'admin1');
      expect(result.amount).toBe(2500);
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: 'PARTIAL_REFUNDED' },
      });
    });

    it('throws NotFoundException for non-existent payment', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.refund('p999', { reason: 'test' }, 'admin1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for non-COMPLETED payment', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p1', status: 'PENDING', amount: new Decimal(50), bookingId: 'b1',
      });
      await expect(service.refund('p1', { reason: 'test' }, 'admin1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for amount exceeding payment', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p1', status: 'COMPLETED', amount: new Decimal(50), bookingId: 'b1',
      });
      await expect(service.refund('p1', { amountCents: 10000, reason: 'test' }, 'admin1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleWebhookEvent', () => {
    it('confirms payment on payment_intent.succeeded', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'p1', status: 'PROCESSING', bookingId: 'b1',
      });
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.payment.update.mockResolvedValue({});
        prisma.booking.update.mockResolvedValue({});
        return fn(prisma);
      });

      await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      });

      expect(prisma.payment.update).toHaveBeenCalled();
      expect(prisma.booking.update).toHaveBeenCalled();
      expect(notifications.notifyPaymentSucceeded).toHaveBeenCalledWith('b1');
    });

    it('marks payment as FAILED on payment_intent.payment_failed', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'p1', status: 'PROCESSING', bookingId: 'b1',
      });
      prisma.payment.update.mockResolvedValue({});

      await service.handleWebhookEvent({
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_123' } },
      });

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: 'FAILED' },
      });
      expect(notifications.enqueue).toHaveBeenCalled();
    });

    it('marks payment as REFUNDED on charge.refunded', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'p1', status: 'COMPLETED', bookingId: 'b1',
      });
      prisma.payment.update.mockResolvedValue({});
      prisma.booking.update.mockResolvedValue({});

      await service.handleWebhookEvent({
        type: 'charge.refunded',
        data: { object: { payment_intent: 'pi_123' } },
      });

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: 'REFUNDED' },
      });
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { status: 'REFUNDED' },
      });
      expect(notifications.enqueue).toHaveBeenCalled();
    });

    it('is idempotent for succeeded (ignores already-processed)', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'p1', status: 'COMPLETED', bookingId: 'b1',
      });

      await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      });

      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(notifications.notifyPaymentSucceeded).not.toHaveBeenCalled();
    });

    it('is idempotent for failed (ignores already-failed)', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'p1', status: 'FAILED', bookingId: 'b1',
      });

      await service.handleWebhookEvent({
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_123' } },
      });

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('ignores unknown event types', async () => {
      await service.handleWebhookEvent({
        type: 'unknown.event',
        data: { object: {} },
      });
      expect(prisma.payment.findFirst).not.toHaveBeenCalled();
    });
  });
});
