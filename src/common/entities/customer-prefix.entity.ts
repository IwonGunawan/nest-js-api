import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_prefix')
export class CustomerPrefix {
  @PrimaryGeneratedColumn({ type: 'tinyint' })
  id: number;

  @Column({ length: 225 })
  prefix: string;

  @OneToMany(() => Customer, (customer) => customer.prefix)
  customers: Customer[];
}
