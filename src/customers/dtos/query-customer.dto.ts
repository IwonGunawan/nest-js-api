import { IsOptional, IsNumberString, IsString } from 'class-validator';

export class QueryCustomerDto {
  @IsOptional()
  @IsNumberString()
  village_id?: string;

  @IsOptional()
  @IsString()
  search?: string; // search by name atau code

  @IsOptional()
  @IsString()
  page: string;

  @IsOptional()
  @IsString()
  limit: string;
}
