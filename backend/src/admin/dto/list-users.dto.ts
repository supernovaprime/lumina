import { IsOptional, IsIn, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListUsersDto {
  @IsOptional()
  @IsIn(['CUSTOMER', 'BUSINESS', 'ADMIN'])
  role?: string;

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

  @IsOptional()
  @IsIn(['createdAt', 'email', 'lastLoginAt'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
