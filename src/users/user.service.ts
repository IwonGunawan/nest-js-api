import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../common/entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  findAll() {
    return this.userRepo.find({
      where: { deleted: '0' },
      order: { createdAt: 'DESC' },
      select: ['id', 'uuid', 'name', 'email', 'level', 'status', 'createdAt'],
    });
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id, deleted: '0' },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }

  async create(dto: CreateUserDto, createdBy: string) {
    // Cek email duplikat
    const existing = await this.userRepo.findOne({
      where: { email: dto.email, deleted: '0' },
    });
    if (existing) throw new ConflictException('Email sudah digunakan');

    const user = this.userRepo.create({
      uuid: uuidv4(),
      name: dto.name,
      email: dto.email,
      password: await bcrypt.hash(dto.password, 10),
      level: dto.level,
      status: '0', // default: active
      token: '',
      createdAt: new Date(),
      createdBy,
    });

    const saved = await this.userRepo.save(user);

    // Jangan return password ke client
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = saved;
    return result;
  }

  async update(id: number, dto: UpdateUserDto, modifiedBy: string) {
    const user = await this.findOne(id);

    // Cek email duplikat kalau email diubah
    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.findOne({
        where: { email: dto.email, deleted: '0' },
      });
      if (existing) throw new ConflictException('Email sudah digunakan');
    }

    Object.assign(user, {
      ...dto,
      modifiedDate: new Date(),
      modifiedBy,
    });

    const saved = await this.userRepo.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = saved;
    return result;
  }

  async toggleStatus(id: number, modifiedBy: string) {
    const user = await this.findOne(id);

    // Toggle: '0' (active) → '1' (non-active), dan sebaliknya
    user.status = user.status === '0' ? '1' : '0';
    user.modifiedAt = new Date();
    user.modifiedBy = modifiedBy;

    await this.userRepo.save(user);

    return {
      id: user.id,
      status: user.status,
      message: user.status === '0' ? 'Akun diaktifkan' : 'Akun dinonaktifkan',
    };
  }
}
