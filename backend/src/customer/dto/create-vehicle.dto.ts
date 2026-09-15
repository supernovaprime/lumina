import { IsString, IsInt, Min, Max, IsIn, Matches, IsOptional } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  make!: string;

  @IsString()
  model!: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year!: number;

  @IsIn(['SEDAN', 'SUV', 'TRUCK', 'VAN', 'MOTORCYCLE', 'OTHER'])
  type!: string;

  @IsIn(['SMALL', 'MEDIUM', 'LARGE'])
  size!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsString()
  @Matches(/^[A-Z0-9\-]+$/i)
  licensePlate!: string;
}
