import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { Payment } from '../common/entities/payment.entity';
import { PaymentDetail } from '../common/entities/payment-detail.entity';
import { Overpayment } from '../common/entities/overpayment.entity';
import { Underpayment } from '../common/entities/underpayment.entity';
import { WaterUsage } from '../common/entities/water-usage.entity';
import { ActivityLog } from '../common/entities/activity-log.entity';
import { PaymentsController } from './payment.controller';
import { PaymentsService } from './payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WaterUsage,
      Payment,
      PaymentDetail,
      Overpayment,
      Underpayment,
      ActivityLog,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, BillingService],
  exports: [PaymentsService, BillingService],
})
export class PaymentsModule {}
