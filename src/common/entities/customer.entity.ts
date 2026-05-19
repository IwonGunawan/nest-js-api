import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CustomerPrefix } from './customer-prefix.entity';
import { Village } from './village.entity';
import { WaterUsage } from './water-usage.entity';
import { Payment } from './payment.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'char', length: 36 })
  uuid: string;

  @Column({ length: 225 })
  code: string;

  @Column({ name: 'prefix_id', type: 'tinyint' })
  prefixId: number;

  @Column({ length: 225 })
  name: string;

  @Column({ type: 'mediumtext', nullable: true })
  address: string;

  @Column({ name: 'village_id' })
  villageId: number;

  @Column({ type: 'datetime', nullable: true, name: 'created_at' })
  createdAt: Date;

  @Column({ nullable: true, name: 'created_by' })
  createdBy: number;

  @Column({ type: 'datetime', nullable: true, name: 'modified_at' })
  modifiedAt: Date;

  @Column({ nullable: true, name: 'modified_by' })
  modifiedBy: number;

  @Column({ type: 'char', length: 1, default: '0' })
  deleted: string; // 0: not deleted, 1: deleted

  @ManyToOne(() => Village, (village) => village.customers)
  @JoinColumn({ name: 'village_id' })
  village: Village;

  @ManyToOne(() => CustomerPrefix, (prefix) => prefix.customers)
  @JoinColumn({ name: 'prefix_id' })
  prefix: CustomerPrefix;

  @OneToMany(() => WaterUsage, (usage) => usage.customer)
  waterUsages: WaterUsage[];

  @OneToMany(() => Payment, (payment) => payment.customer)
  payments: Payment[];
}
