import { IsString, IsInt, Min, Max, IsIn, Matches, IsOptional } from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @IsOptional()
  @IsIn(['SEDAN', 'SUV', 'TRUCK', 'VAN', 'MOTORCYCLE', 'OTHER'])
  type?: string;

  @IsOptional()
  @IsIn(['SMALL', 'MEDIUM', 'LARGE'])
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9\-]+$/i)
  licensePlate?: string;
}
