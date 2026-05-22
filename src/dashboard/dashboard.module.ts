import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Payment } from '../common/entities/payment.entity';
import { WaterUsage } from '../common/entities/water-usage.entity';
import { Underpayment } from '../common/entities/underpayment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, WaterUsage, Underpayment])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
