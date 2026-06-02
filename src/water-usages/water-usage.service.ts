import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { WaterUsage } from '../common/entities/water-usage.entity';
import { RatesService } from '../rates/rate.service';
import { CustomersService } from '../customers/customer.service';
import { QueryWaterUsageDto } from './dtos/query-water-usage.dto';
import { QueryByCustomerDto } from './dtos/query-by-customer.dto';
import { CreateWaterUsageDto } from './dtos/create-water-usage.dto';
import { Customer } from '../common/entities/customer.entity';
import { currentDate } from '../common/consts/datetime';

@Injectable()
export class WaterUsageService {
  constructor(
    @InjectRepository(WaterUsage)
    private waterUsageRepo: Repository<WaterUsage>,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    private ratesService: RatesService,
    private customersService: CustomersService,
  ) {}

  async findAll(query: QueryWaterUsageDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const offset = (page - 1) * limit;
    const sortBy = query.sort_by ?? 'name';
    const sortOrder = query.sort_order ?? 'ASC';

    const { month, year } = currentDate();

    const qb = this.customerRepo
      .createQueryBuilder('c')
      .select([
        'c.id          AS customerId',
        'c.code        AS code',
        'c.name        AS name',
        'c.village_id  AS villageId',
        'prefix.prefix AS prefix',
        // is_checked: 1 jika sudah ada water_usage bulan ini, 0 jika belum
        `CASE WHEN wu.id IS NOT NULL THEN 1 ELSE 0 END AS isChecked`,
      ])
      .leftJoin('c.prefix', 'prefix')
      // left join ke water_usages hanya untuk bulan & tahun sekarang
      .leftJoin(
        'water_usages',
        'wu',
        'wu.customer_id = c.id AND wu.month = :month AND wu.year = :year AND wu.deleted = :deleted',
        { month, year, deleted: '0' },
      )
      .where('c.deleted = :deleted', { deleted: '0' });

    if (query.village_id) {
      qb.andWhere('c.village_id = :villageId', { villageId: query.village_id });
    }

    if (query.search) {
      qb.andWhere('(c.name LIKE :search OR c.code LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const sortColumn = sortBy === 'name' ? 'c.name' : 'c.id';
    qb.orderBy(sortColumn, sortOrder).offset(offset).limit(limit);

    const [data, totalData] = await Promise.all([
      qb.getRawMany(),
      // count query terpisah tanpa pagination
      this.customerRepo
        .createQueryBuilder('c')
        .where('c.deleted = :deleted', { deleted: '0' })
        .andWhere(query.village_id ? 'c.village_id = :villageId' : '1=1', {
          villageId: query.village_id,
        })
        .andWhere(
          query.search ? '(c.name LIKE :search OR c.code LIKE :search)' : '1=1',
          { search: `%${query.search ?? ''}%` },
        )
        .getCount(),
    ]);

    return {
      data,
      meta: {
        totalData,
        page,
        limit,
        totalPages: Math.ceil(totalData / limit),
        checkedMonth: month,
        checkedYear: year,
      },
    };
  }

  async findByCustomer(customerId: number, query: QueryByCustomerDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const offset = (page - 1) * limit;

    const [data, totalData] = await this.waterUsageRepo.findAndCount({
      where: { customerId, deleted: '0' },
      relations: ['rate'],
      order: { year: 'DESC', month: 'DESC' },
      skip: offset,
      take: limit,
    });

    return {
      data,
      meta: {
        totalData,
        page,
        limit,
        totalPages: Math.ceil(totalData / limit),
      },
    };
  }

  async create(dto: CreateWaterUsageDto, userId: number) {
    // 1. Ambil bulan dan tahun dari server
    const { month, year } = currentDate();

    // 2. Jalankan validasi customer dan cek duplikat secara paralel
    const [customer] = await Promise.all([
      this.customersService.findOne(dto.customerId),
      this.validateNoDuplicate(dto.customerId, month, year),
    ]);

    // 3. Tentukan prevMeter berdasarkan kondisi meter
    const prevMeter = await this.resolvePrevMeter(dto.customerId);

    // 4. Validasi angka meter tidak boleh lebih kecil dari sebelumnya
    if (prevMeter > 0 && dto.meterNumber < prevMeter) {
      throw new BadRequestException(
        `Angka meter (${dto.meterNumber}) tidak boleh lebih kecil dari ` +
          `bulan lalu (${prevMeter})`,
      );
    }

    // 5. Hitung pemakaian
    const usage = dto.meterNumber - prevMeter;

    // 6. Ambil tarif aktif
    const rate = await this.ratesService.findCurrent();
    if (!rate) {
      throw new NotFoundException('Tarif belum diset, hubungi administrator');
    }

    // 7. Simpan record baru
    const waterUsage = this.waterUsageRepo.create({
      uuid: uuidv4(),
      customerId: dto.customerId,
      villageId: customer.villageId,
      rateId: rate.id,
      month,
      year,
      meterNumber: dto.meterNumber,
      meterUsage: usage,
      status: '0',
      lastUsed: '0',
      createdBy: userId,
      createdAt: new Date(),
    });

    return this.waterUsageRepo.save(waterUsage);
  }

  async markMeterReplaced(id: number, userId: number) {
    const usage = await this.waterUsageRepo.findOne({
      where: { id, deleted: '0' },
    });
    if (!usage) throw new NotFoundException('Record tidak ditemukan');

    usage.lastUsed = '1';
    usage.modifiedBy = userId;
    usage.modifiedAt = new Date();

    return this.waterUsageRepo.save(usage);
  }

  // ─── Private Helpers ───────────────────────────────────────────────

  private async validateNoDuplicate(
    customerId: number,
    month: number,
    year: number,
  ): Promise<void> {
    const count = await this.waterUsageRepo.count({
      where: { customerId, month, year, deleted: '0' },
    });

    if (count > 0) {
      throw new ConflictException(
        `Data bulan ${month}/${year} sudah ada untuk customer ini`,
      );
    }
  }

  private async resolvePrevMeter(customerId: number): Promise<number> {
    const lastRecord = await this.waterUsageRepo.findOne({
      where: { customerId, deleted: '0' },
      order: { id: 'DESC' },
    });

    // Customer baru atau meter baru setelah diganti
    if (!lastRecord || lastRecord.lastUsed === '1') return 0;

    return lastRecord.meterNumber;
  }
}
