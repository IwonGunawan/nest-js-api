import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Payment } from '../common/entities/payment.entity';
import { PaymentDetail } from '../common/entities/payment-detail.entity';
import { Overpayment } from '../common/entities/overpayment.entity';
import { Underpayment } from '../common/entities/underpayment.entity';
import { WaterUsage } from '../common/entities/water-usage.entity';
import { ActivityLog } from '../common/entities/activity-log.entity';
import { Customer } from '../common/entities/customer.entity';
import { BillingService } from './billing.service';
import { QueryPaymentDto } from './dtos/query-payment.dto';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { QueryWaterUsageDto } from '../water-usages/dtos/query-water-usage.dto';
import { WaterUsageService } from '../water-usages/water-usage.service';
import { formatRupiah, WaterUsageStatus } from '../common/consts';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    private billingService: BillingService,
    private waterUsageService: WaterUsageService,
    private dataSource: DataSource,
  ) {}

  async list(payload: QueryWaterUsageDto) {
    const data = await this.waterUsageService.findAll(payload);
    if (data.meta.totalData == 0) return data;

    const newData = await Promise.all(
      data.data.map(async (row) => {
        const customerId = row.customerId;
        const bill = await this.billingService.getBillDetail(customerId);
        return {
          ...row,
          finalTotal: bill.finalTotal,
        };
      }),
    );

    return {
      ...data,
      data: newData,
    };
  }

  // ─── PAYMENT SUMMARY ──────────────────────────────────────────────

  async paymentSummary() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [totalCount, paidResult] = await Promise.all([
      this.customerRepo.count({ where: { deleted: '0' } }),
      this.paymentRepo
        .createQueryBuilder('p')
        .select('COUNT(DISTINCT p.customerId)', 'count')
        .where('p.deleted = :deleted', { deleted: '0' })
        .andWhere('YEAR(p.createdAt) = :year', { year })
        .andWhere('MONTH(p.createdAt) = :month', { month })
        .getRawOne<{ count: string }>(),
    ]);

    const paidCount = Number(paidResult?.count ?? 0);
    const unpaidCount = totalCount - paidCount;
    const percent =
      totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

    return { paidCount, unpaidCount, percent };
  }

  // ─── GET BILL ──────────────────────────────────────────────────────

  async getBill(customerId: number) {
    const bill = await this.billingService.getBillDetail(customerId);

    if (
      !bill.underpaymentUsage &&
      !bill.overpaymentUsage &&
      bill.waterUsages.length === 0
    ) {
      return bill;
    }

    return {
      customerId,
      waterUsages: bill.waterUsages,
      underpayment: bill.underpaymentAmount,
      overpayment: bill.overpaymentAmount,
      billTotal: bill.billTotal,
      finalTotal: bill.finalTotal,
    };
  }

  // ─── GET PAYMENT HISTORY ───────────────────────────────────────────

  async histories(customerId: number, query: QueryPaymentDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const offset = (page - 1) * limit;

    const [data, total] = await this.paymentRepo.findAndCount({
      select: [
        'id',
        'customerId',
        'total',
        'cash',
        'status',
        'logUuid',
        'createdAt',
      ],
      where: { customerId, deleted: '0' },
      order: { id: 'DESC' },
      skip: offset,
      take: limit,
    });

    return {
      data,
      meta: {
        page,
        limit,
        totalData: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── CREATE PAYMENT ────────────────────────────────────────────────

  async create(dto: CreatePaymentDto, userId: number) {
    // 1. Ambil detail tagihan
    const bill = await this.billingService.getBillDetail(dto.customerId);

    // 2. Validasi cash tidak boleh 0
    if (dto.cash <= 0) {
      throw new BadRequestException('Jumlah cash harus lebih dari 0');
    }

    if (bill.finalTotal == 0) {
      throw new BadRequestException('Tidak ada tagihan untuk customer ini');
    }

    // 3. Hitung kembalian
    const change = dto.cash - bill.finalTotal;

    // 4. Tentukan status pembayaran
    const isUnderpayment = change < 0; // uang cash < total billing
    const isOverpayment = change > 0 && dto.saveChange > 0; // uang cash > billing & customer ingin simpan
    const isExact = !isUnderpayment && !isOverpayment;

    // 5. Proses dalam transaction
    /**
     * insert to payments
     * insert to payment_details
     * insert to activity_logs
     * insert to overpayment || underpayment
     * update water_usages
     */
    return this.dataSource.transaction(async (manager) => {
      const logUuid = uuidv4();
      const now = new Date();

      // 5a. Encode info untuk keperluan receipt (format existing dipertahankan)
      const infoEncoded =
        JSON.stringify(bill.waterUsages) +
        '###' +
        JSON.stringify(bill.underpaymentUsage ?? {}) +
        '###' +
        JSON.stringify(bill.overpaymentUsage ?? {});

      // 5b. Simpan payment
      const payment = await manager.save(
        Payment,
        manager.create(Payment, {
          customerId: dto.customerId,
          total: bill.finalTotal,
          cash: dto.cash,
          status: isOverpayment ? 3 : isUnderpayment ? 2 : 1,
          info: infoEncoded,
          logUuid,
          createdBy: userId,
          createdAt: now,
        }),
      );

      // 5c. Proses tiap bill (ASC: index 0 = bulan terlama)
      for (let i = 0; i < bill.waterUsages.length; i++) {
        const usage = bill.waterUsages[i];
        const isLastMonth = i === bill.waterUsages.length - 1;

        // Simpan payment detail untuk semua bulan
        await manager.save(
          PaymentDetail,
          manager.create(PaymentDetail, {
            paymentId: payment.id,
            waterUsageId: usage.waterUsageId,
          }),
        );

        if (isLastMonth) {
          // Bulan terbaru: tentukan status berdasarkan hasil pembayaran
          if (isUnderpayment) {
            await Promise.all([
              manager.update(WaterUsage, usage.waterUsageId, {
                status: WaterUsageStatus.UNDERPAYMENT,
              }),
              manager.save(
                Underpayment,
                manager.create(Underpayment, {
                  waterUsageId: usage.waterUsageId,
                  amount: Math.abs(change),
                  createdBy: userId,
                  createdAt: now,
                }),
              ),
            ]);
          } else if (isOverpayment) {
            await Promise.all([
              manager.update(WaterUsage, usage.waterUsageId, {
                status: WaterUsageStatus.OVERPAYMENT,
              }),
              manager.save(
                Overpayment,
                manager.create(Overpayment, {
                  waterUsageId: usage.waterUsageId,
                  amount: dto.saveChange,
                  createdBy: userId,
                  createdAt: now,
                }),
              ),
            ]);
          } else {
            // Lunas pas atau kembalian tidak disimpan
            await manager.update(WaterUsage, usage.waterUsageId, {
              status: WaterUsageStatus.PAID,
            });
          }
        } else {
          // Bulan-bulan lama: selalu lunas
          await manager.update(WaterUsage, usage.waterUsageId, {
            status: WaterUsageStatus.PAID,
          });
        }
      } // END of loop list_billing

      // 5f. Simpan activity log
      const activityLogs = [
        manager.create(ActivityLog, {
          uuid: logUuid,
          customerId: dto.customerId,
          type: 'paid',
          action: isUnderpayment
            ? 'kurang_bayar'
            : isOverpayment
              ? 'lunas_lebih_bayar'
              : 'lunas',
          logs: JSON.stringify({
            finalTotal: bill.finalTotal,
            cash: dto.cash,
            change: Math.abs(change),
            save_change: dto.saveChange,
          }),
          createdBy: String(userId),
          createdAt: now,
        }),

        manager.create(ActivityLog, {
          uuid: logUuid,
          customerId: dto.customerId,
          type: 'paid',
          action: 'text_info',
          logs: this.textInfo(isUnderpayment, isOverpayment, change),
          createdBy: String(userId),
          createdAt: now,
        }),
      ];

      await manager.save(ActivityLog, activityLogs);

      // 6. Return receipt
      return this.buildReceipt({
        logUuid,
        now,
        dto,
        bill,
        change,
        isUnderpayment,
        isOverpayment,
        isExact,
      });
    });
  }

  // ─── Private Helpers ───────────────────────────────────────────────

  private textInfo(
    isUnderpayment: boolean,
    isOverpayment: boolean,
    change: number,
  ) {
    /**
     * LUNAS
     * BELUM LUNAS, sisa tagihan Rp10.000
     * LUNAS, disimpan Rp1.000
     */
    return isUnderpayment
      ? `BELUM LUNAS, sisa tagihan ${formatRupiah(Math.abs(change))}`
      : isOverpayment
        ? `LUNAS, disimpan ${formatRupiah(Math.abs(change))} untuk bulan depan`
        : 'LUNAS';
  }

  private buildReceipt(params: {
    logUuid: string;
    now: Date;
    dto: CreatePaymentDto;
    bill: Awaited<ReturnType<BillingService['getBillDetail']>>;
    change: number;
    isUnderpayment: boolean;
    isOverpayment: boolean;
    isExact: boolean;
  }) {
    const { logUuid, now, dto, bill, change, isUnderpayment, isOverpayment } =
      params;

    const textInfo = this.textInfo(isUnderpayment, isOverpayment, change);

    return {
      refNumber: logUuid,
      paidDate: now.toISOString(),
      total: bill.finalTotal,
      cash: dto.cash,
      change: Math.max(0, change),
      monthTotal: bill.waterUsages.length,
      textInfo,
    };
  }
}
