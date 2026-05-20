import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Village } from '../common/entities/village.entity';

@Injectable()
export class VillagesService {
  constructor(
    @InjectRepository(Village)
    private villageRepo: Repository<Village>,
  ) {}

  findAll() {
    return this.villageRepo.find({
      where: { status: '0' },
      order: { id: 'ASC' },
    });
  }

  findOne(id: number) {
    return this.villageRepo.findOne({ where: { id } });
  }
}
