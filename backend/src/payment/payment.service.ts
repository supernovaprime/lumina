import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../libs/prisma/prisma.service';
import { MoneyService } from '../libs/money/money.service';
import { NotificationService } from '../notification/notification.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly money: MoneyService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' as any });
    } else {
      this.stripe = null;
      this.logger.warn('STRIPE_SECRET_KEY not set — Stripe API calls disabled');
    }
  }

  async createPayment(
    userId: string,
    dto: { bookingId: string; method: 'CARD' | 'CASH' },
  ): Promise<{ paymentId: string; status: string; amount: number; clientSecret?: string }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== userId) throw new NotFoundException('Booking not found');
    if (booking.status !== 'PENDING') throw new BadRequestException('Booking is not pending');

    const existingPayment = await this.prisma.payment.findFirst({
      where: { bookingId: dto.bookingId, status: 'COMPLETED' },
    });
    if (existingPayment) throw new ConflictException('Payment already exists for this booking');

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          bookingId: dto.bookingId,
          amount: booking.totalPrice,
          currency: 'USD',
          method: dto.method,
          status: dto.method === 'CASH' ? 'COMPLETED' : 'PROCESSING',
        },
      });

      if (dto.method === 'CASH') {
        await tx.booking.update({
          where: { id: dto.bookingId },
          data: { status: 'CONFIRMED' },
        });
      }

      return p;
    });

    if (dto.method === 'CARD') {
      if (!this.stripe) {
        this.logger.error('Stripe not configured — cannot create PaymentIntent');
        return {
          paymentId: payment.id,
          status: payment.status,
          amount: this.money.toCents(payment.amount),
        };
      }

      try {
        const intent = await this.stripe.paymentIntents.create({
          amount: this.money.toCents(payment.amount),
          currency: payment.currency.toLowerCase(),
          metadata: { bookingId: dto.bookingId, paymentId: payment.id },
        });

        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { transactionId: intent.id },
        });

        return {
          paymentId: payment.id,
          status: 'PROCESSING',
          amount: this.money.toCents(payment.amount),
          clientSecret: intent.client_secret ?? undefined,
        };
      } catch (err: any) {
        this.logger.error(`Stripe PaymentIntent creation failed: ${err.message}`);
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
        throw new BadRequestException('Payment processing failed');
      }
    }

    return {
      paymentId: payment.id,
      status: payment.status,
      amount: this.money.toCents(payment.amount),
    };
  }

  async refund(
    paymentId: string,
    dto: { amountCents?: number; reason: string },
    actorId: string,
  ): Promise<{ refundId: string; status: string; amount: number }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'COMPLETED') throw new BadRequestException('Can only refund completed payments');

    const paymentAmountCents = this.money.toCents(payment.amount);
    const refundAmount = dto.amountCents ?? paymentAmountCents;
    if (refundAmount > paymentAmountCents) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    const isPartial = refundAmount < paymentAmountCents;

    let stripeRefundId: string | null = null;
    if (this.stripe && payment.transactionId) {
      try {
        const stripeRefund = await this.stripe.refunds.create({
          payment_intent: payment.transactionId,
          amount: refundAmount,
        });
        stripeRefundId = stripeRefund.id;
      } catch (err: any) {
        this.logger.error(`Stripe refund failed: ${err.message}`);
        throw new BadRequestException('Refund processing failed');
      }
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      const r = await tx.refund.create({
        data: {
          paymentId,
          amountCents: refundAmount,
          reason: dto.reason,
          status: 'COMPLETED',
          stripeRefundId,
        },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: (isPartial ? 'PARTIAL_REFUNDED' : 'REFUNDED') as any },
      });

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'REFUNDED' },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'PAYMENT_REFUND',
          entityType: 'Payment',
          entityId: paymentId,
          metadata: { refundId: r.id, amountCents: refundAmount, reason: dto.reason, isPartial },
        },
      });

      return r;
    });

    this.notifications.enqueue('refund-processed', payment.bookingId, {
      refundId: refund.id,
      amountCents: refundAmount,
      reason: dto.reason,
    }).catch((err) => this.logger.error(`Refund notification failed: ${err.message}`));

    return {
      refundId: refund.id,
      status: refund.status,
      amount: refundAmount,
    };
  }

  async handleWebhookEvent(event: { type: string; data: { object: any } }): Promise<void> {
    const { type, data } = event;
    const obj = data.object;

    switch (type) {
      case 'payment_intent.succeeded': {
        const payment = await this.prisma.payment.findFirst({
          where: { transactionId: obj.id },
        });
        if (payment && payment.status !== 'COMPLETED') {
          await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: 'COMPLETED', transactionId: obj.id },
            });
            await tx.booking.update({
              where: { id: payment.bookingId },
              data: { status: 'CONFIRMED' },
            });
          });
          this.logger.log(`Payment ${payment.id} confirmed via webhook`);

          this.notifications.notifyPaymentSucceeded(payment.bookingId).catch((err) => {
            this.logger.error(`Payment success notification failed: ${err.message}`);
          });
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const payment = await this.prisma.payment.findFirst({
          where: { transactionId: obj.id },
        });
        if (payment && payment.status !== 'FAILED') {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });
          this.logger.warn(`Payment ${payment.id} failed via webhook`);

          this.notifications.enqueue('booking-cancelled', payment.bookingId, {
            bookingId: payment.bookingId,
            cancelReason: 'Payment failed',
          }).catch((err) => this.logger.error(`Payment failure notification failed: ${err.message}`));
        }
        break;
      }
      case 'charge.refunded': {
        const payment = await this.prisma.payment.findFirst({
          where: { transactionId: obj.payment_intent },
        });
        if (payment) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'REFUNDED' },
          });
          await this.prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'REFUNDED' },
          });
          this.logger.log(`Payment ${payment.id} refunded via webhook`);

          this.notifications.enqueue('refund-processed', payment.bookingId, {
            bookingId: payment.bookingId,
          }).catch((err) => this.logger.error(`Refund notification failed: ${err.message}`));
        }
        break;
      }
    }
  }
}
