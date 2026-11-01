import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteSetting } from '../common/entities/site-setting.entity';

@Injectable()
export class SiteSettingsService {
  constructor(
    @InjectRepository(SiteSetting)
    private repo: Repository<SiteSetting>,
  ) {}

  async getByGroup(group: string) {
    const rows = await this.repo.find({
      where: { group, deleted: '0' },
      select: ['key', 'value'],
    });

    const result: Record<string, string | null> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }

  async getPublicBankInfo() {
    const rows = await this.repo.find({
      where: { group: 'bank', deleted: '0' },
      select: ['key', 'value'],
    });

    const result: Record<string, string | null> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }

    return {
      accountNumber: result['bank_account_number'] ?? null,
      bankName: result['bank_name'] ?? null,
      accountName: result['bank_account_name'] ?? null,
    };
  }
}
