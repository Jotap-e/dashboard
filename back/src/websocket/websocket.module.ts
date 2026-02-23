import { Module } from '@nestjs/common';
import { DealsGateway } from './deals.gateway';
import { DealsStateService } from './deals-state.service';
import { MetasStateService } from './metas-state.service';
import { ForecastsStateService } from './forecasts-state.service';
import { DealsModule } from '../deals/deals.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DealsModule, DatabaseModule],
  providers: [DealsGateway, DealsStateService, MetasStateService, ForecastsStateService],
  exports: [DealsGateway, DealsStateService, MetasStateService, ForecastsStateService],
})
export class WebSocketModule {}
