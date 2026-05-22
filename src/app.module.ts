import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customer.module';
import { RatesModule } from './rates/rate.module';
import { WaterUsageModule } from './water-usages/water-usage.module';
import { PaymentsModule } from './payments/payment.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/report.module';

@Module({
  imports: [
    // load .env global
    ConfigModule.forRoot({ isGlobal: true }),

    // connection db with typeorm
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
      }),
    }),

    // module
    AuthModule,
    CustomersModule,
    RatesModule,
    WaterUsageModule,
    PaymentsModule,
    DashboardModule,
    ReportsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
