import { Module } from '@nestjs/common';
import { DealsGateway } from './deals.gateway';
import { DealsStateService } from './deals-state.service';
import { MetasStateService } from './metas-state.service';

@Module({
  providers: [DealsGateway, DealsStateService, MetasStateService],
  exports: [DealsGateway, DealsStateService, MetasStateService],
})
export class WebSocketModule {}
