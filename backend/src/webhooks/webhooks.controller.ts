import { Controller, Post, Req, Res, HttpCode, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { PaymentService } from '../payment/payment.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');

    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' as any });
    } else {
      this.stripe = null;
      this.logger.warn('STRIPE_SECRET_KEY not set — signature verification disabled');
    }
  }

  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const signature = req.headers['stripe-signature'] as string | undefined;
    const rawBody = (req as any).rawBody;

    if (!this.stripe || !this.webhookSecret) {
      this.logger.warn('Stripe webhook received but signature verification is disabled');
      return this.processEvent(req.body, res);
    }

    if (!signature || !rawBody) {
      this.logger.warn('Missing Stripe signature or raw body');
      return res.status(400).json({ error: 'Missing signature' });
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        typeof rawBody === 'string' ? rawBody : rawBody.toString(),
        signature,
        this.webhookSecret,
      );
    } catch (err: any) {
      this.logger.warn(`Stripe signature verification failed: ${err.message}`);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    return this.processEvent(event as any, res);
  }

  private async processEvent(event: any, res: Response) {
    if (!event || !event.type) {
      this.logger.warn('Invalid webhook payload');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    try {
      this.paymentService.handleWebhookEvent(event).catch((err) => {
        this.logger.error(`Webhook processing error: ${err.message}`);
      });

      return res.status(200).json({ received: true });
    } catch (err: any) {
      this.logger.error(`Webhook error: ${err.message}`);
      return res.status(200).json({ received: true });
    }
  }
}
