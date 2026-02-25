import { Module, forwardRef } from '@nestjs/common';
import { ReunioesController } from './reunioes.controller';
import { DatabaseModule } from '../database/database.module';
import { DealsModule } from '../deals/deals.module';
import { ContactsModule } from '../contacts/contacts.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    DatabaseModule, 
    DealsModule, 
    ContactsModule,
    forwardRef(() => WebSocketModule),
  ],
  controllers: [ReunioesController],
})
export class ReunioesModule {}
