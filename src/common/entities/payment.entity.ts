import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { PaymentDetail } from './payment-detail.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId: number;

  @Column({ type: 'int', default: 0 })
  total: number;

  @Column({ type: 'int', default: 0 })
  cash: number;

  @Column({ type: 'tinyint', default: null })
  status: number; // 1:lunas, 2:kurang-bayar, 3:lebih-bayar

  // Format: bill###underpayment###overpayment
  @Column({ type: 'mediumtext' })
  info: string;

  @Column({ name: 'log_uuid', type: 'char', length: 36 })
  logUuid: string;

  @Column({ type: 'datetime', nullable: true, name: 'created_at' })
  createdAt: Date;

  @Column({ nullable: true, name: 'created_by' })
  createdBy: number;

  @Column({ type: 'char', length: 1, default: '0' })
  deleted: string;

  @ManyToOne(() => Customer, (customer) => customer.payments)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToMany(() => PaymentDetail, (pd) => pd.payment)
  paymentDetails: PaymentDetail[];
}
