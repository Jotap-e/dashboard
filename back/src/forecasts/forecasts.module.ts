import { Module } from '@nestjs/common';
import { ForecastsController } from './forecasts.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ForecastsController],
})
export class ForecastsModule {}
