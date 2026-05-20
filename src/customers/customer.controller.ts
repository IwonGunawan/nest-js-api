import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CustomersService } from './customer.service';
import { QueryCustomerDto } from './dtos/query-customer.dto';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { UpdateCustomerDto } from './dtos/update-customer.dto';
import { User } from '../common/entities/user.entity';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard) // semua endpoint butuh login
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  findAll(@Query() query: QueryCustomerDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Post()
  @Roles('admin') // hanya admin
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: User) {
    return this.customersService.create(dto, user.id);
  }

  @Put(':id')
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: User,
  ) {
    return this.customersService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.customersService.remove(id, user.id);
  }
}
