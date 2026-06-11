import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaterUsageController } from './water-usage.controller';
import { WaterUsageService } from './water-usage.service';
import { WaterUsage } from '../common/entities/water-usage.entity';
import { RatesModule } from '../rates/rate.module';
import { CustomersModule } from '../customers/customer.module';
import { Customer } from '../common/entities/customer.entity';
import { Village } from '../common/entities/village.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WaterUsage, Customer, Village]),
    RatesModule,
    CustomersModule,
  ],
  controllers: [WaterUsageController],
  providers: [WaterUsageService],
  exports: [WaterUsageService],
})
export class WaterUsageModule {}
