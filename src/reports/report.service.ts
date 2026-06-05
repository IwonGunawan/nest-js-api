import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../common/entities/payment.entity';
import { WaterUsage } from '../common/entities/water-usage.entity';
import { ReportQueryDto } from './dtos/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(WaterUsage)
    private waterUsageRepo: Repository<WaterUsage>,
  ) {}

  // Rekap semua pembayaran di bulan tertentu
  async getMonthlyReport(query: ReportQueryDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const offset = (page - 1) * limit;
    const sortOrder = query.sortOrder ?? 'DESC';
    const month = Number(query.month);
    const year = Number(query.year);

    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .select([
        'p.id            AS paymentId',
        'p.total         AS total',
        'p.cash          AS cash',
        'p.log_uuid      AS refNumber',
        'p.created_at    AS paidDate',
        'c.id            AS customerId',
        'c.code          AS customerCode',
        'c.name          AS customerName',
        'cp.prefix       AS prefix',
        'v.village_name  AS village',
        'u.name          AS officer',
      ])
      .innerJoin('customers', 'c', 'c.id = p.customer_id')
      .leftJoin('customer_prefix', 'cp', 'cp.id = c.prefix_id')
      .leftJoin('village', 'v', 'v.village_id = c.village_id')
      .leftJoin('users', 'u', 'u.id = p.created_by')
      .where('MONTH(p.created_at) = :month', { month })
      .andWhere('YEAR(p.created_at) = :year', { year })
      .andWhere('p.deleted = :deleted', { deleted: '0' });

    if (query.villageId) {
      qb.andWhere('c.village_id = :villageId', { villageId: query.villageId });
    }

    if (query.search) {
      qb.andWhere('(c.name LIKE :search OR c.code LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [data, total] = await Promise.all([
      qb
        .orderBy('p.created_at', sortOrder)
        .offset(offset)
        .limit(limit)
        .getRawMany(),
      qb.getCount(),
    ]);

    // Hitung total income bulan ini
    const incomeResult = await this.paymentRepo
      .createQueryBuilder('p')
      .select('SUM(p.total)', 'income')
      .where('MONTH(p.created_at) = :month', { month })
      .andWhere('YEAR(p.created_at) = :year', { year })
      .andWhere('p.deleted = :deleted', { deleted: '0' })
      .getRawOne<{ income: string }>();

    return {
      data,
      summary: {
        totalIncome: Number(incomeResult?.income ?? 0),
        totalTransactions: total,
      },
      meta: {
        month,
        year,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // List customer yang belum/kurang bayar di bulan tertentu
  async getUnpaidReport(query: ReportQueryDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const offset = (page - 1) * limit;
    const sortOrder = query.sortOrder ?? 'ASC';
    const month = Number(query.month);
    const year = Number(query.year);

    const qb = this.waterUsageRepo
      .createQueryBuilder('wu')
      .select([
        'wu.id            AS waterUsageId',
        'wu.month         AS month',
        'wu.year          AS year',
        'wu.meter_usage   AS meterUsage',
        'wu.status        AS status',
        'c.id             AS customerId',
        'c.code           AS customerCode',
        'c.name           AS customerName',
        'cp.prefix        AS prefix',
        'v.village_name   AS village',
        // underpayment amount kalau status='2'
        `COALESCE(up.amount, 0) AS underpaymentAmount`,
      ])
      .innerJoin('customers', 'c', 'c.id = wu.customer_id')
      .leftJoin('customer_prefix', 'cp', 'cp.id = c.prefix_id')
      .leftJoin('village', 'v', 'v.village_id = c.village_id')
      .leftJoin(
        'underpayment',
        'up',
        'up.water_usage_id = wu.id AND up.deleted = :upDeleted',
        { upDeleted: '0' },
      )
      .where('wu.month = :month', { month })
      .andWhere('wu.year = :year', { year })
      .andWhere('wu.status IN (:...statuses)', { statuses: ['0', '2'] })
      .andWhere('wu.deleted = :deleted', { deleted: '0' });

    if (query.villageId) {
      qb.andWhere('c.village_id = :villageId', { villageId: query.villageId });
    }

    if (query.search) {
      qb.andWhere('(c.name LIKE :search OR c.code LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [data, total] = await Promise.all([
      qb.orderBy('c.name', sortOrder).offset(offset).limit(limit).getRawMany(),
      qb.getCount(),
    ]);

    return {
      data,
      meta: {
        month,
        year,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
