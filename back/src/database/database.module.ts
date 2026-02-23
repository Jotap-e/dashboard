import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DatabaseOperationsService } from './database-operations.service';

@Global()
@Module({
  providers: [DatabaseService, DatabaseOperationsService],
  exports: [DatabaseService, DatabaseOperationsService],
})
export class DatabaseModule {}
