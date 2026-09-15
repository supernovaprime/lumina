import { IsArray, ValidateNested, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PriceModifierItemDto {
  @IsString()
  vehicleType!: string;

  @IsString()
  vehicleSize!: string;

  @IsNumber()
  @Min(0.5)
  @Max(3.0)
  multiplier!: number;
}

export class SetPriceModifiersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceModifierItemDto)
  modifiers!: PriceModifierItemDto[];
}
