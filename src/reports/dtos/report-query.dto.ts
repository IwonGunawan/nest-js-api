import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class ReportQueryDto {
  @IsNotEmpty()
  @IsNumberString()
  month: string;

  @IsNotEmpty()
  @IsNumberString()
  year: string;

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
  @IsIn(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC';
}
