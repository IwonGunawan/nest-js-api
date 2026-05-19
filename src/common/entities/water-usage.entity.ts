import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Rate } from './rate.entity';
import { Overpayment } from './overpayment.entity';
import { Underpayment } from './underpayment.entity';
import { PaymentDetail } from './payment-detail.entity';

@Entity('water_usages')
export class WaterUsage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'char', length: 36, nullable: true })
  uuid: string;

  @Column({ name: 'customer_id' })
  customerId: number;

  // Kolom baru — perlu ALTER TABLE water_usages ADD COLUMN rate_id
  @Column({ name: 'rate_id', nullable: true })
  rateId: number;

  @Column()
  year: number;

  @Column()
  month: number;

  @Column({ name: 'meter_number' })
  meterNumber: number;

  @Column({ name: 'meter_usage', default: 0 })
  meterUsage: number;

  @Column({ type: 'char', length: 1 })
  status: string; // 0: baru, 1: lunas, 2: kurang bayar, 3: lebih bayar

  @Column({ name: 'village_id' })
  villageId: number;

  @Column({ name: 'last_used', type: 'char', length: 1, default: '0' })
  lastUsed: string;

  @Column({ type: 'datetime', nullable: true, name: 'created_at' })
  createdAt: Date;

  @Column({ nullable: true, name: 'created_by' })
  createdBy: number;

  @Column({ type: 'datetime', nullable: true, name: 'modified_at' })
  modifiedAt: Date;

  @Column({ nullable: true, name: 'modified_by' })
  modifiedBy: number;

  @Column({ type: 'char', length: 1, default: '0' })
  deleted: string;

  @ManyToOne(() => Customer, (customer) => customer.waterUsages)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Rate, (rate) => rate.waterUsages)
  @JoinColumn({ name: 'rate_id' })
  rate: Rate;

  @OneToMany(() => Overpayment, (op) => op.waterUsage)
  overpayments: Overpayment[];

  @OneToMany(() => Underpayment, (up) => up.waterUsage)
  underpayments: Underpayment[];

  @OneToMany(() => PaymentDetail, (pd) => pd.waterUsage)
  paymentDetails: PaymentDetail[];
}
