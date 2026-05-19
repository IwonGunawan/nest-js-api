import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'char', length: 36 })
  uuid: string;

  @Column({ length: 225 })
  name: string;

  @Column({ length: 225 })
  email: string;

  @Column({ length: 225 })
  password: string;

  @Column({ type: 'char', length: 1, default: '1' })
  status: string; // 0: active, 1: non-active

  @Column({ type: 'char', length: 1, default: '0' })
  level: string; // 0: admin, 1: operator

  @Column({ length: 225 })
  token: string;

  @Column({ name: 'created_at', type: 'datetime', nullable: true })
  createdAt: Date;

  @Column({ name: 'created_by', nullable: true, length: 225 })
  createdBy: string;

  @Column({ name: 'modified_at', type: 'datetime', nullable: true })
  modifiedAt: Date;

  @Column({ name: 'modified_by', nullable: true, length: 225 })
  modifiedBy: string;

  @Column({ type: 'char', length: 1, default: '0' })
  deleted: string; // 0: not deleted, 1: deleted
}
