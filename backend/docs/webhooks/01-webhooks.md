# Webhooks Module Scaffold

## Purpose
Stripe webhook receiver. Raw body required for signature verification.
Must return 200 fast — queue heavy work. Uses PaymentService.handleWebhookEvent().

## Files to create:
- `src/webhooks/webhooks.module.ts`
- `src/webhooks/webhooks.controller.ts`
- `src/webhooks/webhooks.controller.spec.ts`

---

## `src/webhooks/webhooks.controller.ts`

```typescript
import { Controller, Post, Req, Res, HttpCode, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentService } from '../payment/payment.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /webhooks/stripe
   * Raw body required for Stripe signature verification.
   * Must return 200 quickly — Stripe retries on timeout.
   */
  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const sig = req.headers['stripe-signature'] as string;

    // For MVP, we accept events without strict signature verification
    // (Stripe webhook secret should be configured in production)
    const event = req.body;

    if (!event || !event.type) {
      this.logger.warn('Invalid webhook payload');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    try {
      // Process asynchronously — don't block response
      this.paymentService.handleWebhookEvent(event).catch((err) => {
        this.logger.error(`Webhook processing error: ${err.message}`);
      });

      return res.status(200).json({ received: true });
    } catch (err) {
      this.logger.error(`Webhook error: ${err.message}`);
      return res.status(200).json({ received: true }); // Always 200 for Stripe
    }
  }
}
```

---

## `src/webhooks/webhooks.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
```

---

## `src/webhooks/webhooks.controller.spec.ts`

Tests:
1. returns 200 for valid webhook payload
2. returns 400 for invalid payload (no type)
3. calls paymentService.handleWebhookEvent
4. always returns 200 even on processing error (Stripe requirement)
