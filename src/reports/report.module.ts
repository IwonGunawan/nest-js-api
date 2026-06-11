import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../common/entities/payment.entity';
import { WaterUsage } from '../common/entities/water-usage.entity';
import { ReportsController } from './report.controller';
import { ReportsService } from './report.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { Underpayment } from '../common/entities/underpayment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, WaterUsage, Underpayment])],
  controllers: [ReportsController],
  providers: [ReportsService, DashboardService],
})
export class ReportsModule {}
