import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { calcularAlertasPorVendedor } from './forecast-alerta.util';
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
  vendedor_nome?: string; // Nome do vendedor responsável pelo controle
  cliente_nome?: string; // Nome do cliente (da deal)
  cliente_numero?: string; // Telefone do cliente
  valor?: number; // Valor/preço da call (opcional)
}

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/deals',
})
export class DealsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DealsGateway.name);
  private readonly connectedClients = new Map<string, { socket: Socket; room: string }>();
  private readonly processedUpdates = new Map<string, number>(); // deal_id -> timestamp
  private readonly UPDATE_COOLDOWN = 1000; // 1 segundo de cooldown entre atualizações do mesmo deal
  private agendamentosInterval: NodeJS.Timeout | null = null;
  private alertaInterval: NodeJS.Timeout | null = null;

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

  onModuleInit() {
    // Broadcast do estado do alerta a cada segundo para o painel (tempo real)
    this.alertaInterval = setInterval(() => {
      try {
        const allForecasts = this.forecastsStateService.getAllForecasts();
        const now = new Date(Math.floor(Date.now() / 1000) * 1000);
        const alertas = calcularAlertasPorVendedor(allForecasts, now);
        this.server.to('painel').emit('alertaHoraProxima', alertas);
      } catch (err) {
        this.logger.warn(`⚠️ Erro ao broadcast alerta: ${(err as Error)?.message}`);
      }
    }, 1000);
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
   * Sincroniza forecasts do banco com o estado em memória (para o dia atual).
   * Garante que o WebSocket reflita o que está no banco.
   */
  private async syncForecastsFromDatabase(): Promise<void> {
    try {
      const now = new Date();
      const hoje = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const forecastsFromDb = await this.databaseOperationsService.getForecastsByDate(hoje);
      if (forecastsFromDb.length > 0) {
        for (const doc of forecastsFromDb) {
          const forecast: Forecast = {
            id: doc.id,
            vendedorId: doc.vendedorId,
            closerNome: doc.closerNome,
            clienteNome: doc.clienteNome,
            clienteNumero: doc.clienteNumero,
            data: doc.data,
            horario: doc.horario || '',
            valor: doc.valor,
            observacoes: doc.observacoes || '',
            primeiraCall: doc.primeiraCall,
            negociacaoId: doc.negociacaoId,
            classificacao: doc.classificacao || 'morno',
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          };
          this.forecastsStateService.setForecast(forecast);
        }
        this.logger.log(`📥 [GATEWAY] Forecasts sincronizados do banco: ${forecastsFromDb.length} registros`);
      }
    } catch (error: any) {
      this.logger.warn(`⚠️ [GATEWAY] Erro ao sincronizar forecasts do banco: ${error?.message}`);
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
    
    // Sincronizar forecasts do banco antes de enviar estado
    await this.syncForecastsFromDatabase();

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
    
    // Sincronizar forecasts do banco antes de enviar estado
    await this.syncForecastsFromDatabase();
    
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
   * Obtém o nome do vendedor pelo ID (owner_id do RD Station)
   */
  private getVendedorNomeById(ownerId: string): string {
    const envPath = path.join(process.cwd(), '.env');
    const idToName: Record<string, string> = {
      '6936c37038809600166ca22a': 'João Vitor Martins Ribeiro',
      '6924898ebc81ed0013af4f98': 'Pedro',
      '69824580b58d7a00132a276c': 'Thalia Batista',
      '69330c5c687733001309154c': 'Vinicius Oliveira',
      '6978eabe122529001e60f427': 'Yuri Rafael dos Santos',
      '696653f3f2fbf40016c11ea4': 'Gabriel',
      '6936c73f7f78ac001e4278e0': 'Rafael Ratão',
    };
    if (idToName[ownerId]) return idToName[ownerId];
    try {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const [key, ...valParts] = trimmed.split('=');
        const value = valParts.join('=').trim();
        if (value === ownerId) {
          const name = key.replace(/^(CLOSER_|SDR_)_?/, '').replace(/_ID$/, '').replace(/_/g, ' ');
          return name.split(' ').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
        }
      }
    } catch (err) {
      this.logger.warn(`⚠️ Erro ao obter nome do vendedor ${ownerId}`);
    }
    return 'Vendedor';
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
   * Método público para processar atualização de deal "now"
   * Pode ser chamado tanto pelo WebSocket quanto por outros serviços (ex: ReunioesController)
   */
  async handleDealNowUpdate(data: DealNowUpdate) {
    this.logger.log(`📡 Processando atualização de deal:`, {
      deal_id: data.deal_id,
      is_now: data.is_now,
      updated_at: data.updated_at,
    });

    // Validar dados
    if (!data.deal_id || typeof data.is_now !== 'boolean' || !data.updated_at) {
      this.logger.warn(`⚠️ Dados inválidos recebidos`);
      return;
    }

    // Verificar cooldown para evitar spam de atualizações do mesmo deal
    const now = Date.now();
    const lastUpdate = this.processedUpdates.get(data.deal_id);
    if (lastUpdate && (now - lastUpdate) < this.UPDATE_COOLDOWN) {
      this.logger.warn(`⚠️ Atualização ignorada (cooldown): deal ${data.deal_id} atualizado há ${now - lastUpdate}ms`);
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
      // Nome do vendedor responsável pelo controle: enviado no payload ou obtido pelo owner_id
      const vendedorNome = data.vendedor_nome?.trim() || (data.owner_id ? this.getVendedorNomeById(data.owner_id) : 'Vendedor');
      
      this.dealsStateService.setDealNow(data.deal_id, {
        deal_id: data.deal_id,
        is_now: data.is_now,
        updated_at: data.updated_at,
        owner_id: data.owner_id,
        vendedor: vendedorNome,
        cliente_nome: data.cliente_nome,
        cliente_numero: data.cliente_numero,
        valor: data.valor,
      });
      
      // Atualizar reuniões em todo "now" definido
      if (data.owner_id) {
        // Garantir que o vendedor tenha meta (criar se não existir)
        if (!this.metasStateService.getMeta(data.owner_id)) {
          this.metasStateService.setMeta(data.owner_id, vendedorNome, 0, 0);
        }

        this.metasStateService.incrementarReunioes(data.owner_id);

        // Para calls manuais (deal_id começa com "manual_"), usar dados fornecidos
        let clienteNome = data.cliente_nome || 'Cliente';
        let clienteNumero = data.cliente_numero;
        
        // Se não for call manual, buscar dados do RD Station
        if (!data.deal_id.startsWith('manual_')) {
          try {
            const deal = await this.dealsService.getDealById(data.deal_id);
            if (deal?.name) clienteNome = deal.name;
            if (!clienteNumero && deal?.custom_fields) {
              clienteNumero =
                (deal.custom_fields.numero as string) ||
                (deal.custom_fields.telefone as string) ||
                undefined;
            }
          } catch (error) {
            this.logger.warn(`⚠️ Erro ao buscar deal ${data.deal_id} do RD Station:`, error);
          }
        }

        // Salvar reunião no banco de dados
        try {
          await this.databaseOperationsService.saveReuniao(
            data.owner_id,
            vendedorNome,
            data.deal_id,
            clienteNome,
            clienteNumero,
          );
        } catch (error) {
          this.logger.error(`❌ Erro ao salvar reunião no banco: ${data.deal_id}`, error);
        }
      }
    } else {
      this.dealsStateService.removeDealNow(data.deal_id);
    }

    // Enviar atualização para todos os clientes na sala 'painel'
    const currentState = this.dealsStateService.getAllDealsNow();
    this.server.to('painel').emit('dashboardUpdated', currentState);
    this.logger.log(`📤 Estado completo enviado para sala 'painel' (${currentState.length} deals)`);

    // Enviar atualização de metas para todos os clientes
    const currentMetas = this.metasStateService.getAllMetas();
    this.server.emit('metasUpdated', currentMetas);
    this.logger.log(`📤 Estado de metas enviado para todos os clientes`);

    // Enviar confirmação individual para o cliente que enviou
    this.logger.log(`✅ Atualização de deal processada: ${data.deal_id} (is_now: ${data.is_now})`);
  }

  /**
   * Recebe atualização de flag "now" da página de controle via WebSocket
   * e envia para todos os clientes na sala 'painel'
   */
  @SubscribeMessage('update-deal-now')
  async handleUpdateDealNow(
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
      // Nome do vendedor responsável pelo controle: enviado no payload ou obtido pelo owner_id
      const vendedorNome = data.vendedor_nome?.trim() || (data.owner_id ? this.getVendedorNomeById(data.owner_id) : 'Vendedor');
      
      // Para deals manuais, usar dados fornecidos diretamente
      // Para deals do RD Station, buscar dados do serviço
      let clienteNome = data.cliente_nome || 'Cliente';
      let clienteNumero = data.cliente_numero;
      let valor = data.valor;
      
      // Se não for call manual, buscar dados do RD Station
      if (!data.deal_id.startsWith('manual_')) {
        try {
          const deal = await this.dealsService.getDealById(data.deal_id);
          if (deal?.name) clienteNome = deal.name;
          if (!clienteNumero && deal?.custom_fields) {
            clienteNumero =
              (deal.custom_fields.numero as string) ||
              (deal.custom_fields.telefone as string) ||
              (deal.custom_fields.phone as string) ||
              undefined;
          }
          if (!valor && deal?.total_price) {
            valor = deal.total_price;
          }
        } catch (err) {
          this.logger.warn(`⚠️ Não foi possível buscar deal ${data.deal_id} para dados do cliente, usando dados do frontend`);
        }
      }
      
      this.dealsStateService.setDealNow(data.deal_id, {
        deal_id: data.deal_id,
        is_now: data.is_now,
        updated_at: data.updated_at,
        owner_id: data.owner_id,
        vendedor: vendedorNome,
        cliente_nome: clienteNome,
        cliente_numero: clienteNumero,
        valor: valor,
      });
      
      // Atualizar reuniões em todo "now" definido
      if (data.owner_id) {
        // Garantir que o vendedor tenha meta (criar se não existir)
        if (!this.metasStateService.getMeta(data.owner_id)) {
          this.metasStateService.setMeta(data.owner_id, vendedorNome, 0, 0);
        }

        this.metasStateService.incrementarReunioes(data.owner_id);

        // Salvar reunião no MongoDB (contagem via GET /reunioes?vendedorId=xxx)
        this.databaseOperationsService.saveReuniao(
          data.owner_id,
          vendedorNome,
          data.deal_id,
          clienteNome,
          clienteNumero,
        ).catch((error) => {
          this.logger.error('❌ Erro ao salvar reunião no MongoDB:', error);
        });
        
        const updatedMetas = this.metasStateService.getAllMetas();
        this.server.to('painel').emit('metasUpdated', updatedMetas);
        this.server.to('controle').emit('metasUpdated', updatedMetas);
      }
    } else {
      this.dealsStateService.removeDealNow(data.deal_id);
      // Emitir metas atualizadas após remover "now" para sincronizar
      const updatedMetas = this.metasStateService.getAllMetas();
      this.server.to('painel').emit('metasUpdated', updatedMetas);
      this.server.to('controle').emit('metasUpdated', updatedMetas);
    }

    // Enviar estado atualizado completo para todos os clientes na sala 'painel'
    const updatedState = this.dealsStateService.getAllDealsNow();
    this.server.to('painel').emit('dashboardUpdated', updatedState);
    
    // Obter dados completos do deal para enviar no evento individual
    const dealState = updatedState.find(([id]) => id === data.deal_id)?.[1];
    
    // Também enviar atualização individual para compatibilidade
    this.server.to('painel').emit('deal-now-updated', {
      deal_id: data.deal_id,
      is_now: data.is_now,
      updated_at: data.updated_at,
      owner_id: data.owner_id,
      cliente_nome: dealState?.cliente_nome || data.cliente_nome,
      cliente_numero: dealState?.cliente_numero || data.cliente_numero,
      valor: dealState?.valor || data.valor,
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

    // Atualizar estado em memória
    // Se valor_acumulado foi fornecido, passar para setMeta para garantir sincronização
    if (typeof data.valor_acumulado === 'number' && data.valor_acumulado >= 0) {
      this.metasStateService.setMeta(data.vendedor_id, data.vendedor_nome, data.meta, data.valor_acumulado);
    } else {
      // Se não foi fornecido, preservar o valor existente
      this.metasStateService.setMeta(data.vendedor_id, data.vendedor_nome, data.meta);
    }
    
    // Venda é salva via POST /api/vendas pelo frontend ao clicar em "Vendido"
    // O WebSocket apenas sincroniza o valor acumulado em tempo real

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
      closer_nome: data.closerNome,
      cliente: data.clienteNome,
      from: client.id,
    });

    // Validar dados
    if (!data.id || !data.vendedorId || !data.closerNome || !data.clienteNome) {
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

  /**
   * Recebe solicitação de remoção de forecast
   */
  @SubscribeMessage('delete-forecast')
  handleDeleteForecast(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { forecastId: string; vendedorId: string },
  ) {
    if (!data.forecastId || !data.vendedorId) {
      client.emit('error', { message: 'Dados inválidos: forecastId e vendedorId obrigatórios' });
      return;
    }

    this.forecastsStateService.removeForecast(data.forecastId, data.vendedorId);

    const updatedForecasts = this.forecastsStateService.getAllForecasts();
    this.server.to('painel').emit('forecastsUpdated', updatedForecasts);
    this.server.to('controle').emit('forecastsUpdated', updatedForecasts);

    this.logger.log(`🗑️ Forecast removido: ${data.forecastId}`);
    client.emit('forecast-delete-sent', { success: true, forecast_id: data.forecastId });
  }

  /**
   * Finaliza o dia: remove flag "now" dos deals no RD, limpa estado em memória
   * e emite para todos os clientes (painel e controle) para limpar a UI.
   */
  async finalizarDia(): Promise<{ success: boolean; dealsCleared?: number }> {
    this.logger.log('🏁 Iniciando finalização do dia...');

    try {
      // 1. Remover flag "now" de todos os deals no RD Station
      const { cleared } = await this.dealsService.clearAllDealsNow();
      this.logger.log(`✅ ${cleared} deals tiveram flag "now" removida no RD Station`);

      // 2. Deletar forecasts do banco de dados (do dia atual)
      const hoje = new Date().toISOString().split('T')[0];
      const forecastsDeleted = await this.databaseOperationsService.deleteForecastsByDate(hoje);
      this.logger.log(`✅ ${forecastsDeleted} forecasts removidos do banco de dados`);

      // 3. Limpar estado em memória
      this.dealsStateService.clear();
      this.metasStateService.clear();
      this.forecastsStateService.clearAll();
      this.logger.log('✅ Estado em memória limpo (deals, metas, forecasts)');

      // 4. Emitir para todos os clientes para limpar a UI
      this.server.to('painel').emit('dashboardUpdated', []);
      this.server.to('painel').emit('metasUpdated', []);
      this.server.to('painel').emit('forecastsUpdated', []);
      this.server.to('controle').emit('controleStateUpdated', []);
      this.server.to('controle').emit('metasUpdated', []);
      this.server.to('controle').emit('forecastsUpdated', []);
      this.logger.log('✅ Estado vazio emitido para painel e controle');

      this.logger.log('🏁 Dia finalizado com sucesso');
      return { success: true, dealsCleared: cleared };
    } catch (error: any) {
      this.logger.error('❌ Erro ao finalizar dia:', error.message);
      throw error;
    }
  }
}
