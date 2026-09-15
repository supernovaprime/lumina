import { Controller, Post, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
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
