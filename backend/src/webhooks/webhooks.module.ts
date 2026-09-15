import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
