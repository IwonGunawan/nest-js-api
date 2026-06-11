import { IsNumberString, IsOptional } from 'class-validator';

export class WaterUsageTotalQueryDto {
  @IsOptional()
  @IsNumberString()
  month?: string;

  @IsOptional()
  @IsNumberString()
  year?: string;

  @IsOptional()
  @IsNumberString()
  villageId?: string;
}