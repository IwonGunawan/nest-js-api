import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Customer } from './customer.entity';

@Entity('village')
export class Village {
  @PrimaryGeneratedColumn({ name: 'village_id' })
  id: number;

  @Column({ name: 'village_name', length: 225 })
  name: string;

  @Column({ name: 'village_status', type: 'char', length: 1, default: '0' })
  status!: string; // 0: active, 1: non-active

  @OneToMany(() => Customer, (customer) => customer.village)
  customers: Customer[];
}
