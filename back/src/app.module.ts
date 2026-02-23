import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RdTokenModule } from './rd-token/rd-token.module';
import { DealsModule } from './deals/deals.module';
import { WebSocketModule } from './websocket/websocket.module';
import { DatabaseModule } from './database/database.module';
import { ForecastsModule } from './forecasts/forecasts.module';
import { VendasModule } from './vendas/vendas.module';
import { ReunioesModule } from './reunioes/reunioes.module';
import { ContactsModule } from './contacts/contacts.module';

@Module({
  imports: [
    DatabaseModule,
    RdTokenModule,
    DealsModule,
    WebSocketModule,
    ForecastsModule,
    VendasModule,
    ReunioesModule,
    ContactsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
