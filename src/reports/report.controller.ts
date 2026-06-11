import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportsService } from './report.service';
import { ReportQueryDto } from './dtos/report-query.dto';
import { WaterUsageTotalQueryDto } from './dtos/water-usage-total-query.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('monthly')
  @Roles('admin')
  getMonthlyReport(@Query() query: ReportQueryDto) {
    return this.reportsService.getMonthlyReport(query);
  }

  @Get('unpaid')
  @Roles('admin')
  getUnpaidReport(@Query() query: ReportQueryDto) {
    return this.reportsService.getUnpaidReport(query);
  }

  @Get('water-usage-total')
  getWaterUsageTotal(@Query() query: WaterUsageTotalQueryDto) {
    return this.reportsService.getWaterUsageTotal(query);
  }
}
