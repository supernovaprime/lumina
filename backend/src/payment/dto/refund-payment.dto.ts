import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class RefundPaymentDto {
  @IsInt() @Min(1) @IsOptional() amountCents?: number;
  @IsString() @IsNotEmpty() reason!: string;
}
