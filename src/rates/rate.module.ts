import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rate } from '../common/entities/rate.entity';
import { RatesController } from './rate.controller';
import { RatesService } from './rate.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rate])],
  controllers: [RatesController],
  providers: [RatesService],
  exports: [RatesService], // di-export karena dipakai WaterUsageModule nanti
})
export class RatesModule {}
