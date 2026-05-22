import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateWaterUsageDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  customer_id: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  meter_number: number;
}
