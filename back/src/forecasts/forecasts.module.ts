import { Module } from '@nestjs/common';
import { ForecastsController } from './forecasts.controller';
import { DatabaseModule } from '../database/database.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [DatabaseModule, WebSocketModule],
  controllers: [ForecastsController],
})
export class ForecastsModule {}
