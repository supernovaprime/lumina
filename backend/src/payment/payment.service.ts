import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { MoneyService } from '../libs/money/money.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly money: MoneyService,
  ) {}

  async createPayment(
    userId: string,
    dto: { bookingId: string; method: 'CARD' | 'CASH' },
  ): Promise<{ paymentId: string; status: string; amount: number }> {
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

    return {
      paymentId: payment.id,
      status: payment.status,
      amount: this.money.toCents(payment.amount),
    };
  }

  async refund(
    paymentId: string,
    dto: { amountCents?: string; reason: string },
    actorId: string,
  ): Promise<{ refundId: string; status: string; amount: number }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'COMPLETED') throw new BadRequestException('Can only refund completed payments');

    const paymentAmountCents = this.money.toCents(payment.amount);
    const refundAmount = dto.amountCents ? parseInt(dto.amountCents) : paymentAmountCents;
    if (refundAmount > paymentAmountCents) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'REFUNDED' },
      });

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'REFUNDED' },
      });

      return { id: `refund_${paymentId}`, status: 'COMPLETED' };
    });

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
        }
        break;
      }
    }
  }
}
