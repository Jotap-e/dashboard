import { Module } from '@nestjs/common';
import { ReunioesController } from './reunioes.controller';
import { DatabaseModule } from '../database/database.module';
import { DealsModule } from '../deals/deals.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [DatabaseModule, DealsModule, ContactsModule],
  controllers: [ReunioesController],
})
export class ReunioesModule {}
