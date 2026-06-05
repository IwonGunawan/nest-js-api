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
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
