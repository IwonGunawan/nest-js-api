import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsNotEmpty()
  @IsNumber()
  prefix_id: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsNotEmpty()
  @IsNumber()
  village_id: number;
}
