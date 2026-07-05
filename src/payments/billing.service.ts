import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WaterUsage } from '../common/entities/water-usage.entity';
import { Underpayment } from '../common/entities/underpayment.entity';
import { Overpayment } from '../common/entities/overpayment.entity';
import { currentDate } from '../common/consts/datetime';

export interface BillDetail {
  // tagihan baru (status='0')
  waterUsages: WaterUsagePrice[];

  // underpayment dari bulan lalu (status='2')
  underpaymentUsage: WaterUsage | null;
  underpaymentAmount: number;

  // overpayment dari bulan lalu (status='3')
  overpaymentUsage: WaterUsage | null;
  overpaymentAmount: number;

  // hasil kalkulasi
  billTotal: number; // total dari listBill setelah penalty
  finalTotal: number; // billTotal + underpayment - overpayment, ceiling 100
}

export interface WaterUsagePrice {
  waterUsageId: number;
  month: number;
  year: number;
  meterUsage: number;
  status: string; //0: baru, 1: lunas, 2: kurang bayar, 3: lebih bayar
  totalPrice: number;
}

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(WaterUsage)
    private waterUsageRepo: Repository<WaterUsage>,
    @InjectRepository(Underpayment)
    private underpaymentRepo: Repository<Underpayment>,
    @InjectRepository(Overpayment)
    private overpaymentRepo: Repository<Overpayment>,
  ) {}

  async getBillDetail(customerId: number): Promise<BillDetail> {
    // Jalankan 3 query paralel — tidak saling bergantung
    const [listBill, underpaymentUsage, overpaymentUsage] = await Promise.all([
      this.getUnpaidUsages(customerId),
      this.getUnderpaymentUsage(customerId),
      this.getOverpaymentUsage(customerId),
    ]);

    // Ambil nominal underpayment & overpayment kalau ada
    const [underpaymentAmount, overpaymentAmount] = await Promise.all([
      underpaymentUsage
        ? this.getUnderpaymentAmount(underpaymentUsage.id)
        : Promise.resolve(0),
      overpaymentUsage
        ? this.getOverpaymentAmount(overpaymentUsage.id)
        : Promise.resolve(0),
    ]);

    const { waterUsages, accumulated: billTotal } =
      this.calculateBillTotal(listBill);
    const finalTotal = this.ceilingToHundred(
      billTotal + underpaymentAmount - overpaymentAmount,
    );

    return {
      waterUsages: waterUsages,
      underpaymentUsage: underpaymentUsage,
      underpaymentAmount: underpaymentAmount,
      overpaymentUsage: overpaymentUsage,
      overpaymentAmount: overpaymentAmount,
      billTotal: billTotal,
      finalTotal: finalTotal,
    };
  }

  // ─── Kalkulasi ─────────────────────────────────────────────────────

  calculateBillTotal(usages: WaterUsage[]): {
    waterUsages: WaterUsagePrice[];
    accumulated: number;
  } {
    if (usages.length === 0) return { waterUsages: [], accumulated: 0 };

    const current = currentDate();

    // Reverse: proses dari bulan terlama ke terbaru
    const oldest_first = [...usages].reverse();

    let accumulated = 0;
    const waterUsages: WaterUsagePrice[] = [];

    for (const usage of oldest_first) {
      if (['2', '3'].includes(usage.status)) {
        continue;
      }

      const pricePerM3 = Number(usage.rate?.pricePerM3 ?? 0);
      const usageAmount = usage.meterUsage * pricePerM3;
      const isCurrentMonth =
        usage.year === current.year && usage.month === current.month;

      // Penalty 5% — hanya pada usage bulan ini jika tanggal > 15
      // dan selalu pada bulan-bulan sebelumnya
      const applyPenalty = !isCurrentMonth || current.date > 15;
      const penalty = applyPenalty ? usageAmount * 0.05 : 0;
      const total = usageAmount + penalty;

      waterUsages.push({
        waterUsageId: Number(usage.id),
        month: usage.month,
        year: usage.year,
        meterUsage: usage.meterUsage,
        status: usage.status,
        totalPrice: total,
      });

      accumulated += total;
    }

    return { waterUsages, accumulated };
  }

  ceilingToHundred(amount: number): number {
    return Math.ceil(amount / 100) * 100;
  }

  // ─── Queries ───────────────────────────────────────────────────────

  private getUnpaidUsages(customerId: number): Promise<WaterUsage[]> {
    return this.waterUsageRepo.find({
      where: { customerId, status: In(['0', '2', '3']), deleted: '0' },
      relations: ['rate'],
      order: { id: 'DESC' }, // DESC: index 0 = bulan terbaru
    });
  }

  private getUnderpaymentUsage(customerId: number): Promise<WaterUsage | null> {
    return this.waterUsageRepo.findOne({
      where: { customerId, status: '2', deleted: '0' },
      order: { id: 'DESC' },
    });
  }

  private getOverpaymentUsage(customerId: number): Promise<WaterUsage | null> {
    return this.waterUsageRepo.findOne({
      where: { customerId, status: '3', deleted: '0' },
      order: { id: 'DESC' },
    });
  }

  private async getUnderpaymentAmount(waterUsageId: number): Promise<number> {
    const record = await this.underpaymentRepo.findOne({
      where: { waterUsageId, deleted: '0' },
      order: { id: 'DESC' },
    });
    return record?.amount ?? 0;
  }

  private async getOverpaymentAmount(waterUsageId: number): Promise<number> {
    const record = await this.overpaymentRepo.findOne({
      where: { waterUsageId, deleted: '0' },
      order: { id: 'DESC' },
    });
    return record?.amount ?? 0;
  }
}
