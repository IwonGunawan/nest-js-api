import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payment.service';
import { QueryPaymentDto } from './dtos/query-payment.dto';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { User } from '../common/entities/user.entity';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('bill')
  getBill(@Query('customerId', ParseIntPipe) customerId: number) {
    return this.paymentsService.getBill(customerId);
  }

  @Get('customer/:customerId')
  histories(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query() query: QueryPaymentDto,
  ) {
    return this.paymentsService.findByCustomer(customerId, query);
  }

  @Post()
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: User) {
    return this.paymentsService.create(dto, user.id);
  }
}
