import { IsNumberString, IsOptional } from 'class-validator';

export class QueryPaymentDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
