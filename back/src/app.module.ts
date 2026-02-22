import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RdTokenModule } from './rd-token/rd-token.module';
import { DealsModule } from './deals/deals.module';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    RdTokenModule,
    DealsModule,
    WebSocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
