import { Module } from '@nestjs/common';
import { VendasController } from './vendas.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [VendasController],
})
export class VendasModule {}
