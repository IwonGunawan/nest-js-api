import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WaterUsage } from './water-usage.entity';

@Entity('underpayment')
export class Underpayment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'water_usage_id', type: 'bigint' })
  waterUsageId: number;

  @Column({ type: 'int', default: 0 })
  amount: number;

  @Column({ type: 'datetime', nullable: true, name: 'created_at' })
  createdAt: Date;

  @Column({ nullable: true, name: 'created_by' })
  createdBy: number;

  @Column({ type: 'char', length: 1, default: '0' })
  deleted: string;

  @ManyToOne(() => WaterUsage, (usage) => usage.underpayments)
  @JoinColumn({ name: 'water_usage_id' })
  waterUsage: WaterUsage;
}
