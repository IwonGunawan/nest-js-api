import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'char', length: 36 })
  uuid: string;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ length: 225 })
  type: string;

  @Column({ length: 225 })
  action: string;

  @Column({ type: 'text' })
  logs: string;

  @Column({ type: 'datetime', nullable: true, name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'char', length: 1, nullable: true, name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
