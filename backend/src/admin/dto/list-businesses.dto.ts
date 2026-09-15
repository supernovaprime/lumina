import { IsOptional, IsIn, IsString, IsInt, Min, Max, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListBusinessesDto {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsString()
  q?: string;

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
