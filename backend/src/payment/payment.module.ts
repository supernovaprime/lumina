import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { MoneyModule } from '../libs/money/money.module';

@Module({
  imports: [PrismaModule, MoneyModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
