import { IsOptional, IsIn, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListBookingsDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED'])
  status?: string;

  @IsOptional()
  @IsString()
  businessId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
