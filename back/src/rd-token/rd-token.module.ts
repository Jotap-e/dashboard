import { Module } from '@nestjs/common';
import { RdTokenService } from './rd-token.service';
import { RdTokenScheduler } from './rd-token.scheduler';
import { RdTokenController } from './rd-token.controller';

@Module({
  controllers: [RdTokenController],
  providers: [RdTokenService, RdTokenScheduler],
  exports: [RdTokenService],
})
export class RdTokenModule {}
