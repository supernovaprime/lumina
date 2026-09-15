import { IsString, MinLength, MaxLength } from 'class-validator';

export class RespondReviewDto {
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  response!: string;
}
