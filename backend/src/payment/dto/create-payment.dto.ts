import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePaymentDto {
  @IsString() @IsNotEmpty() bookingId!: string;
  @IsString() @IsNotEmpty() method!: 'CARD' | 'CASH';
}
