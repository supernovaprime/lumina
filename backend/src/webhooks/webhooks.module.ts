import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhooksController } from './webhooks.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule, ConfigModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
