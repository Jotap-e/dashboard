import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RdTokenModule } from './rd-token/rd-token.module';
import { DealsModule } from './deals/deals.module';
import { WebSocketModule } from './websocket/websocket.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    DatabaseModule,
    RdTokenModule,
    DealsModule,
    WebSocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
