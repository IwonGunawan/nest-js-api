import { IsNotEmpty, IsNumber } from 'class-validator';

export class GetBillQueryDto {
  @IsNotEmpty()
  @IsNumber()
  customer_id: number;
}
