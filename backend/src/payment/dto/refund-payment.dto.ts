import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RefundPaymentDto {
  @IsString() @IsOptional() amountCents?: string;
  @IsString() @IsNotEmpty() reason!: string;
}
