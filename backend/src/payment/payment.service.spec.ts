import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { MoneyService } from '../libs/money/money.service';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: any;
  let money: any;

  beforeEach(async () => {
    prisma = {
      booking: { findUnique: jest.fn(), update: jest.fn() },
      payment: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };
    money = {
      toCents: jest.fn((d: Decimal) => Math.round(Number(d) * 100)),
      toDecimal: jest.fn((c: number) => new Decimal(c / 100)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: prisma },
        { provide: MoneyService, useValue: money },
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
    });

    it('throws NotFoundException for non-owned booking', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.createPayment('user1', { bookingId: 'b1', method: 'CASH' })).rejects.toThrow(NotFoundException);
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
        id: 'p1', status: 'COMPLETED', amount: new Decimal(50), bookingId: 'b1',
      });
      prisma.$transaction.mockImplementation(async (fn: any) => {
        prisma.payment.update.mockResolvedValue({});
        prisma.booking.update.mockResolvedValue({});
        return fn(prisma);
      });

      const result = await service.refund('p1', { reason: 'Customer request' }, 'admin1');
      expect(result.status).toBe('COMPLETED');
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
      await expect(service.refund('p1', { amountCents: '10000', reason: 'test' }, 'admin1')).rejects.toThrow(BadRequestException);
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
    });

    it('is idempotent (ignores already-processed)', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'p1', status: 'COMPLETED', bookingId: 'b1',
      });

      await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      });

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });
});
