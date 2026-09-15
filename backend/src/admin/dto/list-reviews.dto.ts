import { IsOptional, IsBooleanString, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListReviewsDto {
  @IsOptional()
  @IsBooleanString()
  isHidden?: string;

  @IsOptional()
  @IsString()
  businessId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  maxRating?: number;

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
