import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateWaterUsageDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  customerId: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  meterNumber: number;
}
