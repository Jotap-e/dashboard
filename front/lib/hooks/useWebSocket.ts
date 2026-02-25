'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Forecast } from '@/lib/types/forecast';

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

interface DealNowData {
  deal_id: string;
  is_now: boolean;
  updated_at: string;
  owner_id?: string;
  vendedor?: string;
}

interface MetaDiaria {
  vendedor_id: string;
  vendedor_nome: string;
  meta: number;
  valor_acumulado: number;
  qtd_reunioes: number;
  updated_at: string;
}

// Usar o tipo Forecast do lib/types/forecast

interface UseWebSocketOptions {
  room: 'painel' | 'controle';
  onDealUpdate?: (data: DealNowUpdate) => void;
  onDashboardUpdated?: (state: Array<[string, DealNowData]>) => void; // Para painel: recebe estado completo
  onControleStateUpdated?: (state: Array<[string, string]>) => void; // Para controle: recebe estado de vendedores (vendedor_id -> deal_id)
  onMetasUpdated?: (state: Array<[string, MetaDiaria]>) => void; // Recebe estado de metas (vendedor_id -> MetaDiaria)
  onForecastsUpdated?: (state: Array<[string, Forecast[]]>) => void; // Recebe estado de forecasts (vendedor_id -> Forecast[])
  onAlertaHoraProxima?: (alertas: Array<{ vendedorId: string; forecast: Forecast; countdown: { minutos: number; segundos: number } }>) => void; // Alerta de hora próxima (broadcast a cada 1s)
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: any) => void;
}

export function useWebSocket({
  room,
  onDealUpdate,
  onDashboardUpdated,
  onControleStateUpdated,
  onMetasUpdated,
  onForecastsUpdated,
  onAlertaHoraProxima,
  onConnected,
  onDisconnected,
  onError,
}: UseWebSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Usar refs para callbacks para evitar recriação do useEffect
  const onDealUpdateRef = useRef(onDealUpdate);
  const onDashboardUpdatedRef = useRef(onDashboardUpdated);
  const onControleStateUpdatedRef = useRef(onControleStateUpdated);
  const onMetasUpdatedRef = useRef(onMetasUpdated);
  const onForecastsUpdatedRef = useRef(onForecastsUpdated);
  const onAlertaHoraProximaRef = useRef(onAlertaHoraProxima);
  const onConnectedRef = useRef(onConnected);
  const onDisconnectedRef = useRef(onDisconnected);
  const onErrorRef = useRef(onError);

  // Atualizar refs quando callbacks mudarem
  useEffect(() => {
    onDealUpdateRef.current = onDealUpdate;
    onDashboardUpdatedRef.current = onDashboardUpdated;
    onControleStateUpdatedRef.current = onControleStateUpdated;
    onMetasUpdatedRef.current = onMetasUpdated;
    onForecastsUpdatedRef.current = onForecastsUpdated;
    onAlertaHoraProximaRef.current = onAlertaHoraProxima;
    onConnectedRef.current = onConnected;
    onDisconnectedRef.current = onDisconnected;
    onErrorRef.current = onError;
  }, [onDealUpdate, onDashboardUpdated, onControleStateUpdated, onMetasUpdated, onForecastsUpdated, onAlertaHoraProxima, onConnected, onDisconnected, onError]);

  useEffect(() => {
    // Criar conexão WebSocket
    // Usar variável de ambiente ou fallback para localhost
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
    const wsUrl = backendUrl.replace(/^http/, 'ws').replace(/^https/, 'wss');
    const socket = io(`${wsUrl}/deals`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Eventos de conexão
    socket.on('connect', () => {
      console.log(`🔌 [WebSocket] Conectado ao servidor (${room})`);
      setIsConnected(true);
      setError(null);
      
      // Entrar na sala apropriada
      if (room === 'painel') {
        socket.emit('join-painel');
      } else if (room === 'controle') {
        socket.emit('join-controle');
      }
      
      onConnected?.();
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [WebSocket] Desconectado do servidor (${room})`);
      setIsConnected(false);
      onDisconnectedRef.current?.();
    });

    socket.on('connect_error', (err) => {
      console.error(`❌ [WebSocket] Erro de conexão (${room}):`, err);
      setError('Erro ao conectar com o servidor WebSocket');
      onErrorRef.current?.(err);
    });

    // Evento de confirmação de entrada na sala
    socket.on('joined', (data: { room: string }) => {
      console.log(`✅ [WebSocket] Entrou na sala: ${data.room}`);
    });

    // Evento de estado completo atualizado (apenas para painel)
    if (room === 'painel') {
      socket.on('dashboardUpdated', (state: Array<[string, DealNowData]>) => {
        console.log(`📡 [WebSocket] Estado completo recebido (painel):`, state.length, 'deals');
        onDashboardUpdatedRef.current?.(state);
      });

      // Evento de atualização individual de deal (mantido para compatibilidade)
      socket.on('deal-now-updated', (data: DealNowUpdate) => {
        console.log(`📡 [WebSocket] Atualização individual recebida:`, data);
        onDealUpdateRef.current?.(data);
      });
    }

    // Evento de estado atualizado de vendedores (apenas para controle)
    if (room === 'controle') {
      socket.on('controleStateUpdated', (state: Array<[string, string]>) => {
        console.log(`📡 [WebSocket] Estado de vendedores recebido (controle):`, state.length, 'vendedores');
        onControleStateUpdatedRef.current?.(state);
      });

      // Evento de confirmação de envio
      socket.on('deal-now-update-sent', (data: { success: boolean; deal_id: string }) => {
        console.log(`✅ [WebSocket] Atualização enviada:`, data);
      });
    }

    // Evento de atualização de metas (para ambas as salas)
    socket.on('metasUpdated', (state: Array<[string, MetaDiaria]>) => {
      console.log(`📡 [WebSocket] Estado de metas recebido (${room}):`, state.length, 'metas');
      onMetasUpdatedRef.current?.(state);
    });

    // Evento de atualização de forecasts (para ambas as salas)
    socket.on('forecastsUpdated', (state: Array<[string, Forecast[]]>) => {
      console.log(`📡 [WebSocket] Estado de forecasts recebido (${room}):`, state.length, 'vendedores');
      onForecastsUpdatedRef.current?.(state);
    });

    // Evento de alerta de hora próxima (apenas painel - broadcast a cada 1s pelo backend)
    if (room === 'painel') {
      socket.on('alertaHoraProxima', (alertas: Array<{ vendedorId: string; forecast: Forecast; countdown: { minutos: number; segundos: number } }>) => {
        onAlertaHoraProximaRef.current?.(alertas);
      });
    }

    // Limpeza ao desmontar
    return () => {
      console.log(`🔌 [WebSocket] Desconectando (${room})`);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('joined');
      socket.off('dashboardUpdated');
      socket.off('deal-now-updated');
      socket.off('controleStateUpdated');
      socket.off('metasUpdated');
      socket.off('forecastsUpdated');
      socket.off('alertaHoraProxima');
      socket.off('deal-now-update-sent');
      socket.off('meta-update-sent');
      socket.off('forecast-update-sent');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [room]); // Removidas as dependências dos callbacks para evitar recriação

  // Função para enviar atualização de deal (apenas para controle)
  const sendDealUpdate = useCallback((data: DealNowUpdate) => {
    if (socketRef.current && socketRef.current.connected && room === 'controle') {
      console.log(`📤 [WebSocket] Enviando atualização de deal:`, data);
      socketRef.current.emit('update-deal-now', data);
    } else {
      console.warn(`⚠️ [WebSocket] Não é possível enviar: socket não conectado ou não é sala controle`);
    }
  }, [room]);

  // Função para enviar atualização de meta (apenas para controle)
  const sendMetaUpdate = useCallback((data: { 
    vendedor_id: string; 
    vendedor_nome: string; 
    meta: number; 
    valor_acumulado?: number;
    negociacao_id?: string; // ID da negociação vendida (para salvar venda)
    valor_negociacao?: number; // Valor da negociação vendida (para salvar venda)
  }) => {
    if (socketRef.current && socketRef.current.connected && room === 'controle') {
      console.log(`📤 [WebSocket] Enviando atualização de meta:`, data);
      socketRef.current.emit('update-meta', data);
    } else {
      console.warn(`⚠️ [WebSocket] Não é possível enviar meta: socket não conectado ou não é sala controle`);
    }
  }, [room]);

  // Função para enviar atualização de forecast (apenas para controle)
  const sendForecastUpdate = useCallback((data: Forecast) => {
    if (socketRef.current && socketRef.current.connected && room === 'controle') {
      console.log(`📤 [WebSocket] Enviando atualização de forecast:`, data);
      socketRef.current.emit('update-forecast', data);
    } else {
      console.warn(`⚠️ [WebSocket] Não é possível enviar forecast: socket não conectado ou não é sala controle`);
    }
  }, [room]);

  // Função para enviar remoção de forecast (apenas para controle)
  const sendForecastDelete = useCallback((forecastId: string, vendedorId: string) => {
    if (socketRef.current && socketRef.current.connected && room === 'controle') {
      console.log(`📤 [WebSocket] Enviando remoção de forecast:`, forecastId);
      socketRef.current.emit('delete-forecast', { forecastId, vendedorId });
    } else {
      console.warn(`⚠️ [WebSocket] Não é possível enviar delete forecast: socket não conectado ou não é sala controle`);
    }
  }, [room]);

  return {
    isConnected,
    error,
    sendDealUpdate,
    sendMetaUpdate,
    sendForecastUpdate,
    sendForecastDelete,
    socket: socketRef.current,
  };
}
