import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RatesService } from './rate.service';
import { CreateRateDto } from './dtos/create-rate.dto';
import { User } from '../common/entities/user.entity';

@Controller('rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatesController {
  constructor(private ratesService: RatesService) {}

  @Get()
  @Roles('admin')
  findAll() {
    return this.ratesService.findAll();
  }

  @Get('current')
  findCurrent() {
    return this.ratesService.findCurrent();
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateRateDto, @CurrentUser() user: User) {
    return this.ratesService.create(dto, user.id);
  }
}
