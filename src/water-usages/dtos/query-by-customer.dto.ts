import { IsNumberString, IsOptional } from 'class-validator';

export class QueryByCustomerDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
