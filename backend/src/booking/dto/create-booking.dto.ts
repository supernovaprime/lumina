import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @IsString() @IsNotEmpty() businessId!: string;
  @IsString() @IsNotEmpty() serviceId!: string;
  @IsString() @IsNotEmpty() vehicleId!: string;
  @IsDateString() date!: string;
  @IsString() @IsNotEmpty() startTime!: string;
  @IsString() @IsOptional() notes?: string;
}
