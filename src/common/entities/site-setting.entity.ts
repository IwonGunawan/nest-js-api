import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('site_settings')
export class SiteSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;

  @Column({ length: 50, nullable: true })
  group: string;

  @Column({ length: 225, nullable: true })
  description: string;

  @Column({ name: 'created_at', type: 'datetime', nullable: true })
  createdAt: Date;

  @Column({ name: 'created_by', nullable: true, length: 225 })
  createdBy: string;

  @Column({ name: 'modified_at', type: 'datetime', nullable: true })
  modifiedAt: Date;

  @Column({ name: 'modified_by', nullable: true, length: 225 })
  modifiedBy: string;

  @Column({ type: 'char', length: 1, default: '0' })
  deleted: string;
}
