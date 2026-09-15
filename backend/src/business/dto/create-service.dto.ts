import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(['EXTERIOR', 'INTERIOR', 'FULL_WASH', 'DETAILING', 'ADD_ONS'])
  category!: string;

  @IsNumber()
  @Min(100)
  basePrice!: number;

  @IsNumber()
  @Min(15)
  @Max(480)
  durationMinutes!: number;
}
