import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { Payment } from './payment.entity';
import { WaterUsage } from './water-usage.entity';

@Entity('payment_details')
export class PaymentDetail {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'payment_id', type: 'bigint' })
  paymentId: number;

  @Column({ name: 'water_usage_id', type: 'bigint' })
  waterUsageId: number;

  @ManyToOne(() => Payment, (payment) => payment.paymentDetails)
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @ManyToOne(() => WaterUsage, (usage) => usage.paymentDetails)
  @JoinColumn({ name: 'water_usage_id' })
  waterUsage: WaterUsage;
}
