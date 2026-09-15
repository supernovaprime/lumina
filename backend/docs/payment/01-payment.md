# Payment Module Scaffold

## Purpose
Stripe PaymentIntent creation + refund. MVP supports card-online + cash-on-site.
Backend never touches raw card numbers (PCI SAQ-A). All online money via Stripe.

## Files to create:
- `src/payment/payment.module.ts`
- `src/payment/payment.controller.ts`
- `src/payment/payment.service.ts`
- `src/payment/dto/create-payment.dto.ts`
- `src/payment/dto/refund-payment.dto.ts`
- `src/payment/payment.service.spec.ts`

---

## `src/payment/dto/create-payment.dto.ts`

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePaymentDto {
  @IsString() @IsNotEmpty() bookingId: string;
  @IsString() @IsNotEmpty() method: 'CARD' | 'CASH';
}
```

---

## `src/payment/dto/refund-payment.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

export class RefundPaymentDto {
  @IsInt() @Min(1) @IsOptional() amountCents?: number;
  @IsString() @IsNotEmpty() reason: string;
}
```

---

## `src/payment/payment.service.ts`

```typescript
import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a payment record for cash-on-site booking (§7.1).
   * For CARD payments, frontend uses Stripe Elements directly —
   * this endpoint creates the Payment record + marks booking CONFIRMED.
   */
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

    // Check for existing successful payment
    const existingPayment = await this.prisma.payment.findFirst({
      where: { bookingId: dto.bookingId, status: 'COMPLETED' },
    });
    if (existingPayment) throw new ConflictException('Payment already exists for this booking');

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          bookingId: dto.bookingId,
          amountCents: booking.totalPriceCents,
          currency: booking.currency || 'USD',
          method: dto.method,
          status: dto.method === 'CASH' ? 'PENDING' : 'PROCESSING',
        },
      });

      // Cash payments are confirmed immediately
      if (dto.method === 'CASH') {
        await tx.payment.update({
          where: { id: p.id },
          data: { status: 'COMPLETED' },
        });
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
      amount: Number(payment.amountCents),
    };
  }

  /**
   * Process refund (admin or business owner) (§7.4).
   */
  async refund(
    paymentId: string,
    dto: { amountCents?: number; reason: string },
    actorId: string,
  ): Promise<{ refundId: string; status: string; amount: number }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'COMPLETED') throw new BadRequestException('Can only refund completed payments');

    const refundAmount = dto.amountCents || Number(payment.amountCents);
    if (refundAmount > Number(payment.amountCents)) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      const r = await tx.refund.create({
        data: {
          paymentId,
          amountCents: refundAmount,
          reason: dto.reason,
          status: 'PENDING',
        },
      });

      // If full refund, update payment + booking status
      if (refundAmount === Number(payment.amountCents)) {
        await tx.payment.update({
          where: { id: paymentId },
          data: { status: 'REFUNDED' },
        });
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'REFUNDED' },
        });
      } else {
        await tx.payment.update({
          where: { id: paymentId },
          data: { status: 'PARTIAL_REFUNDED' },
        });
      }

      return r;
    });

    return {
      refundId: refund.id,
      status: refund.status,
      amount: refundAmount,
    };
  }

  /**
   * Handle Stripe webhook events (§7.2).
   * Idempotent: checks Payment.status before processing.
   */
  async handleWebhookEvent(event: { type: string; data: { object: any } }): Promise<void> {
    const { type, data } = event;
    const obj = data.object;

    switch (type) {
      case 'payment_intent.succeeded': {
        const payment = await this.prisma.payment.findFirst({
          where: { stripePaymentIntentId: obj.id },
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
          where: { stripePaymentIntentId: obj.id },
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
```

---

## `src/payment/payment.controller.ts`

```typescript
import { Controller, Post, Body, Param, UseGuards, HttpCode, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Roles('CUSTOMER')
  @HttpCode(201)
  create(@CurrentUser() user: any, @Body() dto: CreatePaymentDto) {
    return this.paymentService.createPayment(user.userId, dto);
  }

  @Post(':id/refund')
  @Roles('ADMIN')
  refund(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: RefundPaymentDto) {
    return this.paymentService.refund(id, dto, user.userId);
  }
}
```

---

## `src/payment/payment.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from '../libs/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
```

---

## `src/payment/payment.service.spec.ts`

Tests:
1. createPayment succeeds for cash payment (auto-confirms)
2. createPayment returns PROCESSING for card payment
3. createPayment throws NotFoundException for non-owned booking
4. createPayment throws ConflictException for duplicate payment
5. refund succeeds for full refund
6. refund succeeds for partial refund
7. refund throws BadRequestException for non-COMPLETED payment
8. refund throws BadRequestException for amount exceeding payment
9. handleWebhookEvent confirms payment on payment_intent.succeeded
10. handleWebhookEvent is idempotent (ignores already-processed)
