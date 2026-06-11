import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WaterUsageService } from './water-usage.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QueryWaterUsageDto } from './dtos/query-water-usage.dto';
import { QueryByCustomerDto } from './dtos/query-by-customer.dto';
import { CreateWaterUsageDto } from './dtos/create-water-usage.dto';
import { User } from '../common/entities/user.entity';

@Controller('water-usage')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WaterUsageController {
  constructor(private waterUsageService: WaterUsageService) {}

  @Get()
  findAll(@Query() query: QueryWaterUsageDto) {
    return this.waterUsageService.findAll(query);
  }

  @Get('customer/:customerId')
  findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query() query: QueryByCustomerDto,
  ) {
    return this.waterUsageService.findByCustomer(customerId, query);
  }

  @Post()
  create(@Body() dto: CreateWaterUsageDto, @CurrentUser() user: User) {
    return this.waterUsageService.create(dto, user.id);
  }

  @Put(':id/mark-replaced')
  markMeterReplaced(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.waterUsageService.markMeterReplaced(id, user.id);
  }

  @Get('progress')
  checkProgress() {
    return this.waterUsageService.checkProgress();
  }
}
