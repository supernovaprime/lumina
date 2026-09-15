import { IsString, IsOptional, IsNumber, IsEnum, Min, Max, MinLength, MaxLength } from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(['EXTERIOR', 'INTERIOR', 'FULL_WASH', 'DETAILING', 'ADD_ONS'])
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(100)
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  durationMinutes?: number;
}
