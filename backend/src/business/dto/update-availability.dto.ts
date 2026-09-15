import { IsNumber, IsArray, IsString, IsObject, Min, Max } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsNumber()
  @Min(15)
  @Max(240)
  slotLengthMinutes!: number;

  @IsNumber()
  @Min(0)
  @Max(60)
  bufferMinutes!: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  maxParallel!: number;

  @IsObject()
  weekly!: Record<string, string[][]>;

  @IsArray()
  @IsString({ each: true })
  blackouts!: string[];
}
