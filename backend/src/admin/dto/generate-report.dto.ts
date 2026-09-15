import { IsString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class GenerateReportDto {
  @IsString()
  from!: string;

  @IsString()
  to!: string;

  @IsIn(['bookings', 'revenue', 'businesses', 'users'])
  type!: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;
}
