import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RespondToReviewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  response!: string;
}
