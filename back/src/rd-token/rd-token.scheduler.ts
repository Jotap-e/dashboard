import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RdTokenService } from './rd-token.service';

@Injectable()
export class RdTokenScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RdTokenScheduler.name);
  private refreshInterval: NodeJS.Timeout;

  constructor(private readonly rdTokenService: RdTokenService) {}

  onModuleInit() {
    // Executa imediatamente ao iniciar
    this.logger.log('🚀 Scheduler de refresh token iniciado');
    this.rdTokenService.refreshToken();

    // Configura o intervalo para executar a cada 7000 segundos
    this.refreshInterval = setInterval(() => {
      this.rdTokenService.refreshToken();
    }, 7000 * 1000); // 7000 segundos em milissegundos

    this.logger.log('⏰ Refresh automático configurado para executar a cada 7000 segundos (~1h 56min)');
  }

  onModuleDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.logger.log('🛑 Scheduler de refresh token parado');
    }
  }
}
