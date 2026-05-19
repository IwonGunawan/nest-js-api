import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { WaterUsage } from './water-usage.entity';

@Entity('rates')
export class Rate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'price_per_m3',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  pricePerM3: number;

  @Column({
    name: 'effective_from',
    type: 'date',
  })
  effectiveFrom: Date;

  @Column({
    name: 'created_by',
    type: 'int',
  })
  createdBy: number;

  @Column({
    name: 'created_at',
    type: 'datetime',
    nullable: true,
  })
  createdAt: Date;

  @OneToMany(() => WaterUsage, (usage) => usage.rate)
  waterUsages: WaterUsage[];
}
