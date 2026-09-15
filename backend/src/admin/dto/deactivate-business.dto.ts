import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeactivateBusinessDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
