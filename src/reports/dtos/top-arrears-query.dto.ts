import { IsNumberString, IsOptional } from 'class-validator';

export class TopArrearsQueryDto {
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsNumberString()
  villageId?: string;
}
