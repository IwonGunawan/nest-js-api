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
import { Village } from '../common/entities/village.entity';
import { currentDate } from '../common/consts/datetime';

export interface WaterUsageListItem {
  customerId: number;
  code: string;
  name: string;
  villageId: number;
  prefix: string;
  isChecked: 0 | 1; // 1 = sudah input bulan ini, 0 = belum
}

export interface WaterUsageListMeta {
  totalData: number;
  page: number;
  limit: number;
  totalPages: number;
  checkedMonth: number;
  checkedYear: number;
}

export interface WaterUsageListResponse {
  data: WaterUsageListItem[];
  meta: WaterUsageListMeta;
}

@Injectable()
export class WaterUsageService {
  constructor(
    @InjectRepository(WaterUsage)
    private waterUsageRepo: Repository<WaterUsage>,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(Village)
    private villageRepo: Repository<Village>,
    private ratesService: RatesService,
    private customersService: CustomersService,
  ) {}

  async findAll(query: QueryWaterUsageDto): Promise<WaterUsageListResponse> {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const offset = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'name';
    const sortOrder = query.sortOrder ?? 'ASC';

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

    if (query.villageId) {
      qb.andWhere('c.village_id = :villageId', { villageId: query.villageId });
    }

    if (query.search) {
      qb.andWhere('(c.name LIKE :search OR c.code LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const sortColumn = sortBy === 'name' ? 'c.name' : 'c.id';
    qb.orderBy(sortColumn, sortOrder).offset(offset).limit(limit);

    const [data, totalData] = await Promise.all([
      qb.getRawMany<WaterUsageListItem>(),
      // count query terpisah tanpa pagination
      this.customerRepo
        .createQueryBuilder('c')
        .where('c.deleted = :deleted', { deleted: '0' })
        .andWhere(query.villageId ? 'c.village_id = :villageId' : '1=1', {
          villageId: query.villageId,
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

    // [TODO] 8. inserrt log to activity_logs

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

  // ─── CHECK PROGRESS ───────────────────────────────────────────────

  async checkProgress() {
    const { month, year } = currentDate();

    type VillageRow = {
      villageId: number;
      villageName: string;
      totalCustomers: string;
      checkedCount: string;
    };

    const rows = await this.villageRepo
      .createQueryBuilder('v')
      .select([
        'v.id                        AS villageId',
        'v.name                      AS villageName',
        'COUNT(DISTINCT c.id)        AS totalCustomers',
        'COUNT(DISTINCT wu.id)       AS checkedCount',
      ])
      .leftJoin('v.customers', 'c', 'c.deleted = :deleted', { deleted: '0' })
      .leftJoin(
        'water_usages',
        'wu',
        'wu.customer_id = c.id AND wu.month = :month AND wu.year = :year AND wu.deleted = :deleted',
        { month, year, deleted: '0' },
      )
      .where('v.status = :active', { active: '0' })
      .groupBy('v.id')
      .addGroupBy('v.name')
      .orderBy('v.id', 'ASC')
      .getRawMany<VillageRow>();

    const villages = rows.map((r) => {
      const total = Number(r.totalCustomers);
      const checked = Number(r.checkedCount);
      return {
        villageId: Number(r.villageId),
        villageName: r.villageName,
        totalCustomers: total,
        checkedCount: checked,
        percent: total > 0 ? Math.round((checked / total) * 100) : 0,
      };
    });

    const overallTotal = villages.reduce((s, v) => s + v.totalCustomers, 0);
    const overallChecked = villages.reduce((s, v) => s + v.checkedCount, 0);

    return {
      month,
      year,
      overall: {
        totalCustomers: overallTotal,
        checkedCount: overallChecked,
        percent:
          overallTotal > 0
            ? Math.round((overallChecked / overallTotal) * 100)
            : 0,
      },
      villages,
    };
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
