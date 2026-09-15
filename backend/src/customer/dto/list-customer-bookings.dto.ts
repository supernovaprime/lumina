import { IsOptional, IsIn, IsBooleanString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListCustomerBookingsDto {
  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED'])
  status?: string;

  @IsOptional()
  @IsBooleanString()
  upcoming?: string;

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
