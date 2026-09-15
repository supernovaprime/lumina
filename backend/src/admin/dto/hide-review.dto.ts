import { IsString, MaxLength } from 'class-validator';

export class HideReviewDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}
