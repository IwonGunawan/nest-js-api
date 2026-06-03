import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsNumber()
  customerId: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  cash: number;

  @IsNotEmpty()
  @IsNumber()
  saveChange: number;
}
