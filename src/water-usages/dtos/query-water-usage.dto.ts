import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryWaterUsageDto {
  @IsOptional()
  @IsNumberString()
  villageId?: string;

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
  sortBy?: 'name' | 'id';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
