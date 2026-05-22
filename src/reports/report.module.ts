import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../common/entities/payment.entity';
import { WaterUsage } from '../common/entities/water-usage.entity';
import { ReportsController } from './report.controller';
import { ReportsService } from './report.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, WaterUsage])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
