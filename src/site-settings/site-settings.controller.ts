import { Controller, Get, Query } from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service';

@Controller('site-settings')
export class SiteSettingsController {
  constructor(private service: SiteSettingsService) {}

  @Get('bank')
  getBank() {
    return this.service.getPublicBankInfo();
  }

  @Get()
  getByGroup(@Query('group') group: string) {
    return this.service.getByGroup(group);
  }
}
