import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsNumber()
  customer_id: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  cash: number;

  @IsNotEmpty()
  @IsNumber()
  save_change: number;
}
