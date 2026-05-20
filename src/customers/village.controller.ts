import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { VillagesService } from './village.service';

@Controller('villages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VillagesController {
  constructor(private villageService: VillagesService) {}

  @Get()
  findAll() {
    return this.villageService.findAll();
  }

  @Get('/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.villageService.findOne(id);
  }
}
