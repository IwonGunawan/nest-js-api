import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../common/entities/payment.entity';
import { WaterUsage } from '../common/entities/water-usage.entity';
import { Underpayment } from '../common/entities/underpayment.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(WaterUsage)
    private waterUsageRepo: Repository<WaterUsage>,
    @InjectRepository(Underpayment)
    private underpaymentRepo: Repository<Underpayment>,
  ) {}

  async getSummary() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [incomeThisMonth, paidCount, unpaidCount, incomeChart, topArrears] =
      await Promise.all([
        this.getIncomeThisMonth(month, year),
        this.getPaidCount(month, year),
        this.getUnpaidCount(month, year),
        this.getIncomeChart(),
        this.getTopArrears(),
      ]);

    return {
      thisMonth: { month, year },
      incomeThisMonth: incomeThisMonth,
      paidCount: paidCount,
      unpaidCount: unpaidCount,
      incomeChart: incomeChart,
      topArrears: topArrears,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────────

  // Total pemasukan bulan ini berdasarkan tanggal payment dibuat
  private async getIncomeThisMonth(
    month: number,
    year: number,
  ): Promise<number> {
    const result = await this.paymentRepo
      .createQueryBuilder('p')
      .select('SUM(p.total)', 'total')
      .where('MONTH(p.created_at) = :month', { month })
      .andWhere('YEAR(p.created_at) = :year', { year })
      .andWhere('p.deleted = :deleted', { deleted: '0' })
      .getRawOne<{ total: string | null }>();

    return Number(result?.total ?? 0);
  }

  // Jumlah customer yang sudah lunas bulan ini
  // status '1' = lunas, '3' = lebih bayar (tetap dianggap lunas)
  private async getPaidCount(month: number, year: number): Promise<number> {
    return this.waterUsageRepo
      .createQueryBuilder('wu')
      .where('wu.month = :month', { month })
      .andWhere('wu.year = :year', { year })
      .andWhere('wu.status IN (:...statuses)', { statuses: ['1', '3'] })
      .andWhere('wu.deleted = :deleted', { deleted: '0' })
      .getCount();
  }

  // Jumlah customer yang belum/kurang bayar bulan ini
  // status '0' = belum bayar, '2' = kurang bayar
  private async getUnpaidCount(month: number, year: number): Promise<number> {
    return this.waterUsageRepo
      .createQueryBuilder('wu')
      .where('wu.month = :month', { month })
      .andWhere('wu.year = :year', { year })
      .andWhere('wu.status IN (:...statuses)', { statuses: ['0', '2'] })
      .andWhere('wu.deleted = :deleted', { deleted: '0' })
      .getCount();
  }

  // Pemasukan 12 bulan terakhir untuk chart
  private async getIncomeChart(): Promise<
    { month: number; year: number; total: number }[]
  > {
    const result = await this.paymentRepo
      .createQueryBuilder('p')
      .select('MONTH(p.created_at)', 'month')
      .addSelect('YEAR(p.created_at)', 'year')
      .addSelect('SUM(p.total)', 'total')
      .where('p.deleted = :deleted', { deleted: '0' })
      .andWhere('p.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)')
      .groupBy('YEAR(p.created_at), MONTH(p.created_at)')
      .orderBy('year', 'ASC')
      .addOrderBy('month', 'ASC')
      .getRawMany<{ month: string; year: string; total: string }>();

    return result.map((r) => ({
      month: Number(r.month),
      year: Number(r.year),
      total: Number(r.total),
    }));
  }

  // Top 10 customer dengan tunggakan terbesar
  async getTopArrears(): Promise<
    {
      customerId: number;
      name: string;
      code: string;
      arrearsAmount: number;
    }[]
  > {
    const result = await this.underpaymentRepo
      .createQueryBuilder('u')
      .select('c.id', 'customer_id')
      .addSelect('c.name', 'name')
      .addSelect('c.code', 'code')
      .addSelect('SUM(u.amount)', 'arrears_amount')
      .innerJoin('water_usages', 'wu', 'wu.id = u.water_usage_id')
      .innerJoin('customers', 'c', 'c.id = wu.customer_id')
      .innerJoin(
        (qb) =>
          qb
            .select('latest.water_usage_id', 'water_usage_id')
            .addSelect('MAX(latest.id)', 'latest_id')
            .from('underpayment', 'latest')
            .where('latest.deleted = :latestDeleted', { latestDeleted: '0' })
            .groupBy('latest.water_usage_id'),
        'latest',
        'latest.water_usage_id = u.water_usage_id AND latest.latest_id = u.id',
      )
      .where('u.deleted = :deleted', { deleted: '0' })
      .andWhere('wu.deleted = :deleted', { deleted: '0' })
      .andWhere('wu.status = :status', { status: '2' })
      .groupBy('c.id, c.name, c.code')
      .orderBy('arrears_amount', 'DESC')
      .limit(10)
      .getRawMany<{
        customer_id: string;
        name: string;
        code: string;
        arrears_amount: string;
      }>();

    return result.map((r) => ({
      customerId: Number(r.customer_id),
      name: r.name,
      code: r.code,
      arrearsAmount: Number(r.arrears_amount),
    }));
  }
}
