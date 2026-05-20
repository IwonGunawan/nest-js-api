import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
} from 'class-validator';

export class CreateRateDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  price_per_m3: number;

  @IsNotEmpty()
  @IsDateString()
  effective_from: string; // format: YYYY-MM-DD
}
