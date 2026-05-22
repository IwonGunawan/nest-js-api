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
import { BillingService } from './billing.service';
import { QueryPaymentDto } from './dtos/query-payment.dto';
import { CreatePaymentDto } from './dtos/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    private billingService: BillingService,
    private dataSource: DataSource,
  ) {}

  // ─── GET BILL ──────────────────────────────────────────────────────

  async getBill(customerId: number) {
    const bill = await this.billingService.getBillDetail(customerId);

    return {
      customerId,
      listBill: bill.listBill.map((u) => ({
        // water_usage_id: u.id,
        month: u.month,
        year: u.year,
        meterUsage: u.meterUsage,
      })),
      underpayment: bill.underpaymentAmount,
      overpayment: bill.overpaymentAmount,
      billTotal: bill.billTotal,
      finalTotal: bill.finalTotal,
    };
  }

  // ─── GET PAYMENT HISTORY ───────────────────────────────────────────

  async findByCustomer(customerId: number, query: QueryPaymentDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const offset = (page - 1) * limit;

    const [data, total] = await this.paymentRepo.findAndCount({
      where: { customerId, deleted: '0' },
      relations: ['paymentDetails'],
      order: { id: 'DESC' },
      skip: offset,
      take: limit,
    });

    return {
      data,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  // ─── CREATE PAYMENT ────────────────────────────────────────────────

  async create(dto: CreatePaymentDto, userId: number) {
    // 1. Ambil detail tagihan
    const bill = await this.billingService.getBillDetail(dto.customer_id);

    // 2. Validasi cash tidak boleh 0
    if (dto.cash <= 0) {
      throw new BadRequestException('Jumlah cash harus lebih dari 0');
    }

    // 3. Hitung kembalian
    const change = dto.cash - bill.finalTotal;

    // 4. Tentukan status pembayaran
    const isUnderpayment = change < 0; // uang cash < total billing
    const isOverpayment = change > 0 && dto.save_change > 0; // uang cash > billing & customer ingin simpan
    const isExact = !isUnderpayment && !isOverpayment;

    // 5. Proses dalam transaction
    return this.dataSource.transaction(async (manager) => {
      const logUuid = uuidv4();
      const now = new Date();

      // 5a. Encode info untuk keperluan receipt (format existing dipertahankan)
      const infoEncoded =
        JSON.stringify(bill.listBill) +
        '###' +
        JSON.stringify(bill.underpaymentUsage ?? {}) +
        '###' +
        JSON.stringify(bill.overpaymentUsage ?? {});

      // 5b. Simpan payment
      const payment = await manager.save(
        Payment,
        manager.create(Payment, {
          customerId: dto.customer_id,
          total: bill.finalTotal,
          cash: dto.cash,
          info: infoEncoded,
          logUuid,
          createdBy: userId,
          createdAt: now,
        }),
      );

      // 5c. Settlement underpayment lama (kalau ada)
      if (bill.underpaymentUsage) {
        await Promise.all([
          manager.update(WaterUsage, bill.underpaymentUsage.id, {
            status: '1',
          }),
          manager.save(
            PaymentDetail,
            manager.create(PaymentDetail, {
              paymentId: payment.id,
              waterUsageId: bill.underpaymentUsage.id, // => underpaymentUsage.id is water_usage_id
            }),
          ),
        ]);
      }

      // 5d. Settle overpayment lama (kalau ada)
      if (bill.overpaymentUsage) {
        await Promise.all([
          manager.update(WaterUsage, bill.overpaymentUsage.id, {
            status: '1',
          }),
          manager.save(
            PaymentDetail,
            manager.create(PaymentDetail, {
              paymentId: payment.id,
              waterUsageId: bill.overpaymentUsage.id,
            }),
          ),
        ]);
      }

      // 5e. Proses tiap bill (DESC: index 0 = bulan terbaru)
      for (let i = 0; i < bill.listBill.length; i++) {
        const usage = bill.listBill[i];
        const isMostRecent = i === 0;

        // Simpan payment detail untuk semua bulan
        await manager.save(
          PaymentDetail,
          manager.create(PaymentDetail, {
            paymentId: payment.id,
            waterUsageId: usage.id,
          }),
        );

        if (isMostRecent) {
          // Bulan terbaru: tentukan status berdasarkan hasil pembayaran
          if (isUnderpayment) {
            await Promise.all([
              manager.update(WaterUsage, usage.id, { status: '2' }),
              manager.save(
                Underpayment,
                manager.create(Underpayment, {
                  waterUsageId: usage.id,
                  amount: Math.abs(change),
                  createdBy: userId,
                  createdAt: now,
                }),
              ),
            ]);
          } else if (isOverpayment) {
            await Promise.all([
              manager.update(WaterUsage, usage.id, { status: '3' }),
              manager.save(
                Overpayment,
                manager.create(Overpayment, {
                  waterUsageId: usage.id,
                  amount: change,
                  createdBy: userId,
                  createdAt: now,
                }),
              ),
            ]);
          } else {
            // Lunas pas atau kembalian tidak disimpan
            await manager.update(WaterUsage, usage.id, { status: '1' });
          }
        } else {
          // Bulan-bulan lama: selalu lunas
          await manager.update(WaterUsage, usage.id, { status: '1' });
        }
      } // END of loop list_billing

      // 5f. Simpan activity log
      await manager.save(
        ActivityLog,
        manager.create(ActivityLog, {
          uuid: logUuid,
          customerId: dto.customer_id,
          type: 'paid',
          action: 'paid',
          logs: JSON.stringify({
            cash: dto.cash,
            total: bill.finalTotal,
            change: Math.abs(change),
            save_change: dto.save_change,
            status: isUnderpayment
              ? 'underpayment'
              : isOverpayment
                ? 'overpayment'
                : 'lunas',
          }),
          createdBy: String(userId),
          createdAt: now,
        }),
      );

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

    const textInfo = isUnderpayment
      ? `BELUM LUNAS, sisa tagihan Rp ${Math.abs(change).toLocaleString('id-ID')}`
      : isOverpayment
        ? `LUNAS, disimpan Rp ${change.toLocaleString('id-ID')} untuk bulan depan`
        : 'LUNAS';

    return {
      refNumber: logUuid,
      paidDate: now.toISOString(),
      total: bill.finalTotal,
      cash: dto.cash,
      change: Math.max(0, change),
      monthTotal: bill.listBill.length + (bill.underpaymentUsage ? 1 : 0),
      textInfo,
    };
  }
}
