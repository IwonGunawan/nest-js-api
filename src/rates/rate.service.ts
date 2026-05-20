import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rate } from '../common/entities/rate.entity';
import { CreateRateDto } from './dtos/create-rate.dto';

@Injectable()
export class RatesService {
  constructor(
    @InjectRepository(Rate)
    private rateRepo: Repository<Rate>,
  ) {}

  findAll() {
    return this.rateRepo.find({ order: { effectiveFrom: 'DESC' } });
  }

  // tarif aktif = row dengan effective_from paling baru yang sudah lewat/sama dengan hari ini
  async findCurrent() {
    return this.rateRepo
      .createQueryBuilder('rate')
      .where('rate.effective_from <= :today', {
        today: new Date().toISOString().split('T')[0],
      })
      .orderBy('rate.effective_from', 'DESC')
      .getOne();
  }

  async create(dto: CreateRateDto, userId: number) {
    const rate = this.rateRepo.create({
      pricePerM3: dto.price_per_m3,
      effectiveFrom: new Date(dto.effective_from),
      createdBy: userId,
      createdAt: new Date(),
    });
    return this.rateRepo.save(rate);
  }
}
