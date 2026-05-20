import { VillagesService } from './village.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../common/entities/customer.entity';
import { CustomerLog } from '../common/entities/customer-log.entity';
import { CustomerPrefix } from '../common/entities/customer-prefix.entity';
import { CustomersController } from './customer.controller';
import { CustomersService } from './customer.service';
import { VillagesController } from './village.controller';
import { Village } from '../common/entities/village.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerLog, CustomerPrefix, Village]),
  ],
  controllers: [CustomersController, VillagesController],
  providers: [CustomersService, VillagesService],
  exports: [CustomersService, VillagesService],
})
export class CustomersModule {}
