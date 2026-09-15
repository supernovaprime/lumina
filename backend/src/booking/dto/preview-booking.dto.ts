import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class PreviewBookingDto {
  @IsString() @IsNotEmpty() businessId!: string;
  @IsString() @IsNotEmpty() serviceId!: string;
  @IsString() @IsNotEmpty() vehicleId!: string;
  @IsDateString() date!: string;
  @IsString() @IsNotEmpty() startTime!: string;
}
