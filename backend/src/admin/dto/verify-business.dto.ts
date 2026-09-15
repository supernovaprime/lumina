import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifyBusinessDto {
  @IsIn(['APPROVE', 'REJECT'])
  action!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
