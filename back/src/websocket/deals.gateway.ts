import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DealsStateService } from './deals-state.service';
import { MetasStateService } from './metas-state.service';
import { ForecastsStateService, Forecast } from './forecasts-state.service';
import { DealsService } from '../deals/deals.service';
import { DatabaseOperationsService } from '../database/database-operations.service';
import * as fs from 'fs';
import * as path from 'path';

interface DealNowUpdate {
  deal_id: string;
  is_now: boolean;
  updated_at: string;
  owner_id?: string;
  cliente_nome?: string; // Nome do cliente para salvar reunião
}

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/deals',
})
export class DealsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DealsGateway.name);
  private readonly connectedClients = new Map<string, { socket: Socket; room: string }>();
  private readonly processedUpdates = new Map<string, number>(); // deal_id -> timestamp
  private readonly UPDATE_COOLDOWN = 1000; // 1 segundo de cooldown entre atualizações do mesmo deal
  private agendamentosInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly dealsStateService: DealsStateService,
    private readonly metasStateService: MetasStateService,
    private readonly forecastsStateService: ForecastsStateService,
    private readonly dealsService: DealsService,
    private readonly databaseOperationsService: DatabaseOperationsService,
  ) {
    // Iniciar atualização periódica de agendamentos de SDRs (a cada 5 minutos)
    this.iniciarAtualizacaoPeriodicaAgendamentos();
  }

  /**
   * Inicia atualização periódica de agendamentos de SDRs
   */
  private iniciarAtualizacaoPeriodicaAgendamentos(): void {
    // Atualizar imediatamente ao iniciar
    this.atualizarAgendamentosSdrs();
    
    // Configurar intervalo para atualizar a cada 5 minutos
    this.agendamentosInterval = setInterval(() => {
      this.atualizarAgendamentosSdrs();
    }, 5 * 60 * 1000); // 5 minutos
  }

  /**
   * Para atualização periódica (útil para testes ou shutdown)
   */
  private pararAtualizacaoPeriodicaAgendamentos(): void {
    if (this.agendamentosInterval) {
      clearInterval(this.agendamentosInterval);
      this.agendamentosInterval = null;
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      client.leave(clientInfo.room);
      this.connectedClients.delete(client.id);
    }
  }

  /**
   * Cliente se junta à sala 'painel' para receber atualizações
   * Envia o estado atual imediatamente ao conectar
   */
  @SubscribeMessage('join-painel')
  async handleJoinPainel(@ConnectedSocket() client: Socket) {
    client.join('painel');
    this.connectedClients.set(client.id, { socket: client, room: 'painel' });
    this.logger.log(`Cliente ${client.id} entrou na sala 'painel'`);
    
    // Enviar estado atual de deals imediatamente ao conectar
    const currentState = this.dealsStateService.getAllDealsNow();
    this.logger.log(`📤 [GATEWAY] Enviando estado atual de deals para painel: ${currentState.length} deals`);
    client.emit('dashboardUpdated', currentState);
    
    // Atualizar agendamentos dos SDRs antes de enviar estado de metas
    await this.atualizarAgendamentosSdrs();
    
    // Enviar estado atual de metas imediatamente ao conectar
    const currentMetas = this.metasStateService.getAllMetas();
    this.logger.log(`📤 [GATEWAY] Enviando estado atual de metas para painel: ${currentMetas.length} metas`);
    client.emit('metasUpdated', currentMetas);
    
    // Enviar estado atual de forecasts imediatamente ao conectar
    const currentForecasts = this.forecastsStateService.getAllForecasts();
    this.logger.log(`📤 [GATEWAY] Enviando estado atual de forecasts para painel: ${currentForecasts.length} vendedores`);
    client.emit('forecastsUpdated', currentForecasts);
    
    client.emit('joined', { room: 'painel' });
  }

  /**
   * Cliente se junta à sala 'controle' para enviar atualizações
   * Envia o estado atual de deals "now" por vendedor e metas imediatamente ao conectar
   */
  @SubscribeMessage('join-controle')
  async handleJoinControle(@ConnectedSocket() client: Socket) {
    client.join('controle');
    this.connectedClients.set(client.id, { socket: client, room: 'controle' });
    this.logger.log(`Cliente ${client.id} entrou na sala 'controle'`);
    
    // Enviar estado atual de deals "now" por vendedor imediatamente ao conectar
    const vendedorNowState = this.dealsStateService.getAllVendedorNow();
    this.logger.log(`📤 [GATEWAY] Enviando estado atual de deals para controle: ${vendedorNowState.length} vendedores`);
    client.emit('controleStateUpdated', vendedorNowState);
    
    // Atualizar agendamentos dos SDRs antes de enviar estado
    await this.atualizarAgendamentosSdrs();
    
    // Enviar estado atual de metas imediatamente ao conectar
    const currentMetas = this.metasStateService.getAllMetas();
    this.logger.log(`📤 [GATEWAY] Enviando estado atual de metas para controle: ${currentMetas.length} metas`);
    client.emit('metasUpdated', currentMetas);
    
    // Enviar estado atual de forecasts imediatamente ao conectar
    const currentForecasts = this.forecastsStateService.getAllForecasts();
    this.logger.log(`📤 [GATEWAY] Enviando estado atual de forecasts para controle: ${currentForecasts.length} vendedores`);
    client.emit('forecastsUpdated', currentForecasts);
    
    client.emit('joined', { room: 'controle' });
  }

  /**
   * Atualiza agendamentos dos SDRs buscando do CRM
   * Chama o método do DealsService e atualiza as metas dos SDRs
   */
  private async atualizarAgendamentosSdrs(): Promise<void> {
    try {
      this.logger.log('📅 [GATEWAY] Atualizando agendamentos dos SDRs...');
      
      // A função agora retorna contagem diretamente: { rafaelRatao: number, gabriel: number }
      const agendamentos = await this.dealsService.getSdrAgendamentosHoje();
      
      // Obter IDs dos SDRs do .env
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      try {
        envContent = fs.readFileSync(envPath, 'utf-8');
      } catch (error) {
        this.logger.error('❌ [GATEWAY] Erro ao ler .env:', error);
        return;
      }
      
      // Extrair IDs dos SDRs
      const rafaelRataoIdMatch = envContent.match(/SDR_RAFAEL_RATAO_ID=(.+)/);
      const gabrielIdMatch = envContent.match(/SDR_GABRIELO_ID=(.+)/);
      
      const rafaelRataoId = rafaelRataoIdMatch?.[1]?.trim();
      const gabrielId = gabrielIdMatch?.[1]?.trim();
      
      // Usar contagem retornada diretamente pela função
      if (rafaelRataoId) {
        // Verificar se já existe meta para Rafael Ratão, se não criar uma básica
        const metaRafael = this.metasStateService.getMeta(rafaelRataoId);
        if (!metaRafael) {
          this.metasStateService.setMeta(rafaelRataoId, 'Rafael Ratão', 0, 0);
        }
        this.metasStateService.atualizarAgendamentos(rafaelRataoId, agendamentos.rafaelRatao);
        this.logger.log(`✅ [GATEWAY] Agendamentos atualizados para Rafael Ratão: ${agendamentos.rafaelRatao}`);
      } else {
        this.logger.warn('⚠️ [GATEWAY] SDR_RAFAEL_RATAO_ID não encontrado no .env');
      }
      
      if (gabrielId) {
        // Verificar se já existe meta para Gabriel, se não criar uma básica
        const metaGabriel = this.metasStateService.getMeta(gabrielId);
        if (!metaGabriel) {
          this.metasStateService.setMeta(gabrielId, 'Gabriel', 0, 0);
        }
        this.metasStateService.atualizarAgendamentos(gabrielId, agendamentos.gabriel);
        this.logger.log(`✅ [GATEWAY] Agendamentos atualizados para Gabriel: ${agendamentos.gabriel}`);
      } else {
        this.logger.warn('⚠️ [GATEWAY] SDR_GABRIELO_ID não encontrado no .env');
      }
      
      // Enviar atualização de metas para todos os clientes conectados
      const currentMetas = this.metasStateService.getAllMetas();
      this.server.emit('metasUpdated', currentMetas);
      this.logger.log(`📤 [GATEWAY] Estado de metas atualizado enviado para todos os clientes`);
    } catch (error: any) {
      this.logger.error('❌ [GATEWAY] Erro ao atualizar agendamentos dos SDRs:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
    }
  }

  /**
   * Recebe atualização de flag "now" da página de controle
   * e envia para todos os clientes na sala 'painel'
   */
  @SubscribeMessage('update-deal-now')
  handleUpdateDealNow(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DealNowUpdate,
  ) {
    this.logger.log(`📡 Recebida atualização de deal:`, {
      deal_id: data.deal_id,
      is_now: data.is_now,
      updated_at: data.updated_at,
      from: client.id,
    });

    // Validar dados
    if (!data.deal_id || typeof data.is_now !== 'boolean' || !data.updated_at) {
      this.logger.warn(`⚠️ Dados inválidos recebidos de ${client.id}`);
      client.emit('error', { message: 'Dados inválidos' });
      return;
    }

    // Verificar cooldown para evitar spam de atualizações do mesmo deal
    const now = Date.now();
    const lastUpdate = this.processedUpdates.get(data.deal_id);
    if (lastUpdate && (now - lastUpdate) < this.UPDATE_COOLDOWN) {
      this.logger.warn(`⚠️ Atualização ignorada (cooldown): deal ${data.deal_id} atualizado há ${now - lastUpdate}ms`);
      client.emit('deal-now-update-sent', {
        success: true,
        deal_id: data.deal_id,
        skipped: true,
      });
      return;
    }

    // Registrar timestamp da atualização
    this.processedUpdates.set(data.deal_id, now);

    // Limpar atualizações antigas (mais de 5 minutos)
    if (this.processedUpdates.size > 1000) {
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      for (const [dealId, timestamp] of this.processedUpdates.entries()) {
        if (timestamp < fiveMinutesAgo) {
          this.processedUpdates.delete(dealId);
        }
      }
    }

    // Atualizar estado em memória
    if (data.is_now) {
      this.dealsStateService.setDealNow(data.deal_id, {
        deal_id: data.deal_id,
        is_now: data.is_now,
        updated_at: data.updated_at,
        owner_id: data.owner_id,
      });
      
      // Incrementar contagem de reuniões quando um closer define um deal como "agora"
      if (data.owner_id) {
        const metaAntes = this.metasStateService.getMeta(data.owner_id);
        const totalReunioesAntes = metaAntes?.qtd_reunioes || 0;
        
        this.metasStateService.incrementarReunioes(data.owner_id);
        
        const metaDepois = this.metasStateService.getMeta(data.owner_id);
        const totalReunioesVendedor = metaDepois?.qtd_reunioes || 0;
        
        // Calcular total de reuniões do time
        const todasMetas = this.metasStateService.getAllMetas();
        const totalReunioesTime = todasMetas.reduce((total, [_, meta]) => {
          return total + (meta.qtd_reunioes || 0);
        }, 0);
        
        // Buscar nome do cliente (precisamos buscar do deal)
        // Por enquanto, vamos usar um valor padrão e melhorar depois
        const clienteNome = 'Cliente'; // TODO: Buscar do deal real
        
        // Salvar reunião no MongoDB
        this.databaseOperationsService.saveReuniao(
          data.owner_id,
          metaDepois?.vendedor_nome || 'Vendedor',
          data.deal_id,
          clienteNome,
          totalReunioesVendedor,
          totalReunioesTime,
        ).catch((error) => {
          this.logger.error('❌ Erro ao salvar reunião no MongoDB:', error);
        });
        
        // Enviar estado atualizado de metas para todos os clientes
        const updatedMetas = this.metasStateService.getAllMetas();
        this.server.to('painel').emit('metasUpdated', updatedMetas);
        this.server.to('controle').emit('metasUpdated', updatedMetas);
      }
    } else {
      this.dealsStateService.removeDealNow(data.deal_id);
    }

    // Enviar estado atualizado completo para todos os clientes na sala 'painel'
    const updatedState = this.dealsStateService.getAllDealsNow();
    this.server.to('painel').emit('dashboardUpdated', updatedState);
    
    // Também enviar atualização individual para compatibilidade
    this.server.to('painel').emit('deal-now-updated', {
      deal_id: data.deal_id,
      is_now: data.is_now,
      updated_at: data.updated_at,
      owner_id: data.owner_id,
    });

    // Enviar estado atualizado de vendedores para sala 'controle'
    const vendedorNowState = this.dealsStateService.getAllVendedorNow();
    this.server.to('controle').emit('controleStateUpdated', vendedorNowState);

    // Atualizar valor acumulado do vendedor se houver owner_id
    if (data.owner_id && data.is_now) {
      // Calcular valor acumulado do vendedor (soma dos valores dos deals "now" dele)
      const dealsDoVendedor = Array.from(this.dealsStateService.getAllDealsNow())
        .filter(([_, dealData]) => dealData.owner_id === data.owner_id);
      
      // Aqui precisaríamos buscar os valores reais dos deals, mas por enquanto vamos manter
      // O frontend pode calcular e enviar o valor acumulado quando atualizar a meta
    }

    this.logger.log(`✅ Atualização enviada para salas 'painel' e 'controle'`);
    
    // Confirmar recebimento para o cliente que enviou
    client.emit('deal-now-update-sent', {
      success: true,
      deal_id: data.deal_id,
    });
  }

  /**
   * Recebe atualização de meta diária da página de controle
   * e envia para todos os clientes na sala 'painel'
   */
  @SubscribeMessage('update-meta')
  handleUpdateMeta(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      vendedor_id: string; 
      vendedor_nome: string; 
      meta: number; 
      valor_acumulado?: number;
      negociacao_id?: string; // ID da negociação vendida (para salvar venda)
      valor_negociacao?: number; // Valor da negociação vendida (para salvar venda)
    },
  ) {
    this.logger.log(`📡 Recebida atualização de meta:`, {
      vendedor_id: data.vendedor_id,
      vendedor_nome: data.vendedor_nome,
      meta: data.meta,
      valor_acumulado: data.valor_acumulado,
      from: client.id,
    });

    // Validar dados
    if (!data.vendedor_id || !data.vendedor_nome || typeof data.meta !== 'number' || data.meta < 0) {
      this.logger.warn(`⚠️ Dados inválidos recebidos de ${client.id}`);
      client.emit('error', { message: 'Dados inválidos' });
      return;
    }

    // Verificar se é uma venda (valor_acumulado aumentou)
    const metaAntes = this.metasStateService.getMeta(data.vendedor_id);
    const valorAcumuladoAntes = metaAntes?.valor_acumulado || 0;
    const isVenda = typeof data.valor_acumulado === 'number' 
      && data.valor_acumulado > valorAcumuladoAntes
      && data.valor_acumulado > 0;
    
    // Atualizar estado em memória
    // Se valor_acumulado foi fornecido, passar para setMeta para garantir sincronização
    if (typeof data.valor_acumulado === 'number' && data.valor_acumulado >= 0) {
      this.metasStateService.setMeta(data.vendedor_id, data.vendedor_nome, data.meta, data.valor_acumulado);
    } else {
      // Se não foi fornecido, preservar o valor existente
      this.metasStateService.setMeta(data.vendedor_id, data.vendedor_nome, data.meta);
    }
    
    // Se é uma venda, salvar no MongoDB
    if (isVenda) {
      // Usar valor_negociacao do frontend se fornecido, senão calcular
      const valorNegociacao = data.valor_negociacao || (data.valor_acumulado - valorAcumuladoAntes);
      
      // Calcular valor acumulado total do time
      const todasMetas = this.metasStateService.getAllMetas();
      const valorAcumuladoTime = todasMetas.reduce((total, [_, meta]) => {
        return total + (meta.valor_acumulado || 0);
      }, 0);
      
      // Usar negociacao_id do frontend se fornecido
      const negociacaoId = data.negociacao_id || 'unknown';
      
      // Salvar venda no MongoDB
      this.databaseOperationsService.saveVenda(
        data.vendedor_id,
        data.vendedor_nome,
        negociacaoId,
        valorNegociacao,
        data.valor_acumulado,
        valorAcumuladoTime,
      ).catch((error) => {
        this.logger.error('❌ Erro ao salvar venda no MongoDB:', error);
      });
    }

    // Enviar estado atualizado de metas para todos os clientes nas salas 'painel' e 'controle'
    const updatedMetas = this.metasStateService.getAllMetas();
    this.server.to('painel').emit('metasUpdated', updatedMetas);
    this.server.to('controle').emit('metasUpdated', updatedMetas);

    this.logger.log(`✅ Meta atualizada e enviada para salas 'painel' e 'controle'`);
    
    // Confirmar recebimento para o cliente que enviou
    client.emit('meta-update-sent', {
      success: true,
      vendedor_id: data.vendedor_id,
    });
  }

  /**
   * Recebe atualização de forecast da página de controle
   * e envia para todos os clientes nas salas 'painel' e 'controle'
   */
  @SubscribeMessage('update-forecast')
  handleUpdateForecast(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: Forecast,
  ) {
    this.logger.log(`📡 Recebida atualização de forecast:`, {
      forecast_id: data.id,
      vendedor_id: data.vendedorId,
      vendedor_nome: data.vendedorNome,
      cliente: data.clienteNome,
      from: client.id,
    });

    // Validar dados
    if (!data.id || !data.vendedorId || !data.vendedorNome || !data.clienteNome) {
      this.logger.warn(`⚠️ Dados inválidos recebidos de ${client.id}`);
      client.emit('error', { message: 'Dados inválidos' });
      return;
    }

    // Atualizar estado em memória
    this.forecastsStateService.setForecast(data);
    
    // Salvar forecast no MongoDB
    this.databaseOperationsService.saveForecast(data).catch((error) => {
      this.logger.error('❌ Erro ao salvar forecast no MongoDB:', error);
    });

    // Enviar estado atualizado de forecasts para todos os clientes nas salas 'painel' e 'controle'
    const updatedForecasts = this.forecastsStateService.getAllForecasts();
    this.server.to('painel').emit('forecastsUpdated', updatedForecasts);
    this.server.to('controle').emit('forecastsUpdated', updatedForecasts);

    this.logger.log(`✅ Forecast atualizado e enviado para salas 'painel' e 'controle'`);
    
    // Confirmar recebimento para o cliente que enviou
    client.emit('forecast-update-sent', {
      success: true,
      forecast_id: data.id,
    });
  }
}
