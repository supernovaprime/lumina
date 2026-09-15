import { Controller, Post, Req, Res, HttpCode, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentService } from '../payment/payment.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const event = req.body;

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
