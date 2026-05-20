import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Customer } from '../common/entities/customer.entity';
import { CustomerLog } from '../common/entities/customer-log.entity';
import { QueryCustomerDto } from './dtos/query-customer.dto';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { VILLAGE_CODE_MAP } from '../common/consts';
import { UpdateCustomerDto } from './dtos/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerLog)
    private customerLogRepo: Repository<CustomerLog>,
  ) {}

  async findAll(query: QueryCustomerDto) {
    const qb = this.customerRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.village', 'village')
      .leftJoinAndSelect('c.prefix', 'prefix')
      .where('c.deleted = :deleted', { deleted: '0' });

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    if (query.village_id) {
      qb.andWhere('c.villageId = :villageId', {
        villageId: query.village_id,
      });
    }

    if (query.search) {
      qb.andWhere('(c.name LIKE :search OR c.code LIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    const [data, total] = await qb
      .orderBy('c.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const customer = await this.customerRepo.findOne({
      where: { id, deleted: '0' },
      relations: ['village', 'prefix'],
    });

    if (!customer) throw new NotFoundException('Customer tidak ditemukan');
    return customer;
  }

  async create(payload: CreateCustomerDto, userId: number) {
    let genCode: string;
    let existing: Customer | null;

    do {
      genCode = this._generateCode(payload.village_id);

      existing = await this.customerRepo.findOne({
        where: { code: genCode, deleted: '0' },
      });
    } while (existing);

    const customer = this.customerRepo.create({
      ...payload,
      code: genCode,
      prefixId: payload.prefix_id,
      villageId: payload.village_id,
      uuid: uuidv4(),
      createdBy: userId,
      createdAt: new Date(),
    });

    const saved = await this.customerRepo.save(customer);
    await this._saveLog(saved.id, null, saved, 'created');

    return saved;
  }

  async update(id: number, payload: UpdateCustomerDto, userId: number) {
    const customer = await this.customerRepo.findOne({
      where: { id, deleted: '0' },
    });

    if (!customer) {
      throw new NotFoundException('Customer tidak ditemukan');
    }
    const before = { ...customer };

    Object.assign(customer, {
      ...payload,
      ...(payload.prefix_id && { prefixId: payload.prefix_id }),
      ...(payload.village_id && { villageId: payload.village_id }),
      modifiedBy: userId,
      modifiedAt: new Date(),
    });

    const saved = await this.customerRepo.save(customer);

    // simpan log sebelum dan sesudah perubahan
    await this._saveLog(id, before, saved, 'updated');

    return saved;
  }

  async remove(id: number, userId: number) {
    const customer = await this.customerRepo.findOne({
      where: { id, deleted: '0' },
    });

    if (!customer) {
      throw new NotFoundException('Customer tidak ditemukan');
    }

    // soft delete — tidak hapus dari DB, hanya tandai deleted = '1'
    customer.deleted = '1';
    customer.modifiedBy = userId;
    customer.modifiedAt = new Date();

    return this.customerRepo.save(customer);
  }

  private async _saveLog(
    customerId: number,
    before: any,
    after: any,
    type: 'created' | 'updated',
  ) {
    const log = this.customerLogRepo.create({
      customerId,
      beforeChange: JSON.stringify(before ?? {}),
      afterChange: JSON.stringify(after),
      type,
      createdAt: new Date(),
    });
    return this.customerLogRepo.save(log);
  }

  private _generateCode(villageId: number) {
    const villageCode = VILLAGE_CODE_MAP[villageId];

    if (!villageCode) {
      throw new NotFoundException('Village code tidak ditemukan');
    }

    const randomNumber = Math.floor(Math.random() * 900000) + 100000;

    return `${villageCode}${randomNumber}`;
  }
}
