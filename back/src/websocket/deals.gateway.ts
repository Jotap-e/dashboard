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

interface DealNowUpdate {
  deal_id: string;
  is_now: boolean;
  updated_at: string;
  owner_id?: string;
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

  constructor(
    private readonly dealsStateService: DealsStateService,
    private readonly metasStateService: MetasStateService,
  ) {}

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
  handleJoinPainel(@ConnectedSocket() client: Socket) {
    client.join('painel');
    this.connectedClients.set(client.id, { socket: client, room: 'painel' });
    this.logger.log(`Cliente ${client.id} entrou na sala 'painel'`);
    
    // Enviar estado atual de deals imediatamente ao conectar
    const currentState = this.dealsStateService.getAllDealsNow();
    this.logger.log(`📤 [GATEWAY] Enviando estado atual de deals para painel: ${currentState.length} deals`);
    client.emit('dashboardUpdated', currentState);
    
    // Enviar estado atual de metas imediatamente ao conectar
    const currentMetas = this.metasStateService.getAllMetas();
    this.logger.log(`📤 [GATEWAY] Enviando estado atual de metas para painel: ${currentMetas.length} metas`);
    client.emit('metasUpdated', currentMetas);
    
    client.emit('joined', { room: 'painel' });
  }

  /**
   * Cliente se junta à sala 'controle' para enviar atualizações
   * Envia o estado atual de deals "now" por vendedor e metas imediatamente ao conectar
   */
  @SubscribeMessage('join-controle')
  handleJoinControle(@ConnectedSocket() client: Socket) {
    client.join('controle');
    this.connectedClients.set(client.id, { socket: client, room: 'controle' });
    this.logger.log(`Cliente ${client.id} entrou na sala 'controle'`);
    
    // Enviar estado atual de deals "now" por vendedor imediatamente ao conectar
    const vendedorNowState = this.dealsStateService.getAllVendedorNow();
    this.logger.log(`📤 [GATEWAY] Enviando estado atual de deals para controle: ${vendedorNowState.length} vendedores`);
    client.emit('controleStateUpdated', vendedorNowState);
    
    // Enviar estado atual de metas imediatamente ao conectar
    const currentMetas = this.metasStateService.getAllMetas();
    this.logger.log(`📤 [GATEWAY] Enviando estado atual de metas para controle: ${currentMetas.length} metas`);
    client.emit('metasUpdated', currentMetas);
    
    client.emit('joined', { room: 'controle' });
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
    @MessageBody() data: { vendedor_id: string; vendedor_nome: string; meta: number },
  ) {
    this.logger.log(`📡 Recebida atualização de meta:`, {
      vendedor_id: data.vendedor_id,
      vendedor_nome: data.vendedor_nome,
      meta: data.meta,
      from: client.id,
    });

    // Validar dados
    if (!data.vendedor_id || !data.vendedor_nome || typeof data.meta !== 'number' || data.meta < 0) {
      this.logger.warn(`⚠️ Dados inválidos recebidos de ${client.id}`);
      client.emit('error', { message: 'Dados inválidos' });
      return;
    }

    // Atualizar estado em memória
    this.metasStateService.setMeta(data.vendedor_id, data.vendedor_nome, data.meta);

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
}
