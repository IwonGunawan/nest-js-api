import { IsOptional, IsNumberString, IsString, IsIn } from 'class-validator';

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

  /**
   * '0' = customer aktif (deleted = '0')
   * '1' = customer non-aktif (deleted = '1')
   * kosong / tidak dikirim = default ke '0' (aktif)
   */
  @IsOptional()
  @IsIn(['0', '1'])
  status?: '0' | '1';
}
