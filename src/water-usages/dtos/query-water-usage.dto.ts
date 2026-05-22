import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryWaterUsageDto {
  @IsOptional()
  @IsNumberString()
  village_id?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsIn(['name', 'id'])
  sort_by?: 'name' | 'id';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC';
}
