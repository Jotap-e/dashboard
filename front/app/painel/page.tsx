'use client';

import { BackgroundLogo } from '@/components/ui/background-logo';
import { StackedCards } from '@/components/painel/stacked-cards';
import { BlocoLabel } from '@/components/painel/bloco-label';
import { VendedorMetaCard } from '@/components/painel/vendedor-meta-card';
import { TeamOverview } from '@/components/painel/team-overview';
import { ForecastTable } from '@/components/painel/forecast-table';
import { FinalizarDiaDialog } from '@/components/painel/finalizar-dia-dialog';
import { Clock } from '@/components/painel/clock';
import { CloserCard } from '@/components/painel/closer-card';
import { Forecast } from '@/lib/types/forecast';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Loader2, Phone, DollarSign, Check, FileBarChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusNegociacao, TipoBloco, Negociacao } from '@/lib/types/negociacoes';
import { VENDEDOR_IDS, getVendedorTipo } from '@/lib/utils/vendedores';
import { getHojeLocal } from '@/lib/utils/forecast';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

// Mapeamento de owner_id para nome do vendedor
const getVendedorNameById = (ownerId: string): string | null => {
  for (const [name, id] of Object.entries(VENDEDOR_IDS)) {
    if (id === ownerId) {
      return name;
    }
  }
  return null;
};

// Mapear status do RD Station para status interno
const mapRdStatusToInternal = (rdStatus: string): StatusNegociacao => {
  const statusMap: Record<string, StatusNegociacao> = {
    'won': 'ganho',
    'lost': 'negociacao',
    'open': 'negociacao',
    'ongoing': 'negociacao',
  };
  return statusMap[rdStatus] || 'negociacao';
};

// Por enquanto, todos os cards são forecast
const tipoBloco: TipoBloco = 'forecast';

// Configuração de status para badges
const statusConfig: Record<StatusNegociacao, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; color: string }> = {
  indicacao: { label: 'Indicação', variant: 'default', color: '#3b82f6' },
  conectado: { label: 'Conectado', variant: 'outline', color: '#f59e0b' },
  agendado: { label: 'Agendado', variant: 'warning', color: '#f59e0b' },
  agendado_sdr: { label: 'Agendado SDR', variant: 'warning', color: '#f59e0b' },
  reuniao: { label: 'Reunião', variant: 'default', color: '#3b82f6' },
  negociacao: { label: 'Negociação', variant: 'default', color: '#3b82f6' },
  ganho: { label: 'Ganho', variant: 'success', color: '#22c55e' },
};

// Função para formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

interface NegociacoesPorVendedor {
  vendedor: string;
  negociacoes: Negociacao[];
}

const STORAGE_KEY = 'painel_deals_now_map';

// Funções helper para localStorage usando Map
const saveDealsMapToLocalStorage = (dealsMap: Map<string, Negociacao>) => {
  try {
    // Converter Map para array de pares [key, value] para serialização
    const mapArray = Array.from(dealsMap.entries());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapArray));
    console.log('💾 [PAINEL] Map de deals salvo no localStorage:', dealsMap.size);
  } catch (error) {
    console.error('❌ [PAINEL] Erro ao salvar Map no localStorage:', error);
  }
};

const loadDealsMapFromLocalStorage = (): Map<string, Negociacao> => {
  // Verificar se está no cliente antes de acessar localStorage
  if (typeof window === 'undefined') {
    return new Map<string, Negociacao>();
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const mapArray = JSON.parse(stored) as Array<[string, Negociacao]>;
      const dealsMap = new Map<string, Negociacao>(mapArray);
      console.log('📂 [PAINEL] Map de deals carregado do localStorage:', dealsMap.size);
      return dealsMap;
    }
  } catch (error) {
    console.error('❌ [PAINEL] Erro ao carregar Map do localStorage:', error);
  }
  return new Map<string, Negociacao>();
};

// Converter Map para formato NegociacoesPorVendedor[] para renderização
const mapToNegociacoesPorVendedor = (dealsMap: Map<string, Negociacao>): NegociacoesPorVendedor[] => {
  const groupedByVendedor: Record<string, Negociacao[]> = {};
  
  dealsMap.forEach((negociacao) => {
    if (!groupedByVendedor[negociacao.vendedor]) {
      groupedByVendedor[negociacao.vendedor] = [];
    }
    groupedByVendedor[negociacao.vendedor].push(negociacao);
  });
  
  return Object.entries(groupedByVendedor).map(([vendedor, negociacoes]) => ({
    vendedor,
    negociacoes,
  }));
};

import { MetaDiaria } from '@/lib/types/metas';

export default function PainelPage() {
  // Map para rastrear deals com flag "now" (deal_id -> Negociacao)
  // Inicializar vazio para evitar erro de hidratação (localStorage não existe no servidor)
  const [dealsNowMap, setDealsNowMap] = useState<Map<string, Negociacao>>(new Map());
  
  // Map para rastrear metas diárias (vendedor_id -> MetaDiaria)
  const [metasMap, setMetasMap] = useState<Map<string, MetaDiaria>>(new Map());
  
  // Map para rastrear forecasts por vendedor (vendedor_id -> Forecast[])
  const [forecastsMap, setForecastsMap] = useState<Map<string, Forecast[]>>(new Map());

  // Alerta de hora próxima por vendedor (vendedor_id -> { forecast, countdown }) - atualizado via WebSocket a cada 1s
  const [alertaMap, setAlertaMap] = useState<Map<string, { forecast: Forecast; countdown: { minutos: number; segundos: number } }>>(new Map());
  
  // Converter Map para formato de renderização
  const negociacoesPorVendedor = useMemo(() => {
    return mapToNegociacoesPorVendedor(dealsNowMap);
  }, [dealsNowMap]);

  // Valores acumulados vêm apenas das metas via WebSocket (atualizados quando o closer marca como vendido)
  // Não buscamos valor_acumulado nem qtd_reunioes do banco - apenas via WebSocket (metasMap)

  // Lista de closers que já tiveram pelo menos uma ação (meta, now ou forecast)
  // Um closer só aparece no painel após sua primeira interação
  // Cada closer é calculado independentemente para evitar re-renders desnecessários
  const vendedoresClosers = useMemo(() => {
    const hoje = getHojeLocal();
    const closersNomes = Object.keys(VENDEDOR_IDS).filter((nome) => getVendedorTipo(nome) === 'closer');

    // Criar um Map para rastrear quais closers devem aparecer
    const closersAtivos = new Map<string, {
      vendedor: string;
      ownerId: string;
      meta: MetaDiaria | null;
      valorAcumulado: number;
      reunioes: number;
      forecastsHoje: Forecast[];
      items: Array<{ negociacao: Negociacao }>;
    }>();

    closersNomes.forEach((vendedor) => {
      const ownerId = VENDEDOR_IDS[vendedor];
      if (!ownerId) return;

      // Buscar dados específicos deste closer
      const meta = metasMap.get(ownerId) || null;
      const valorAcumulado = meta?.valor_acumulado ?? 0;
      const reunioes = meta?.qtd_reunioes ?? 0;
      const forecasts = forecastsMap.get(ownerId) || [];
      const forecastsHoje = forecasts.filter((f) => f.data === hoje);

      // Items "now" vêm de negociacoesPorVendedor
      const { negociacoes } = negociacoesPorVendedor.find((n) => n.vendedor === vendedor) || { negociacoes: [] };
      const items = negociacoes.map((negociacao) => ({
        negociacao,
      }));

      // Verificar se este closer deve aparecer na primeira ação (meta, forecast ou now)
      const temMeta = meta !== null; // Qualquer meta definida (incluindo 0)
      const temNow = items.length > 0;
      const temForecast = forecastsHoje.length > 0;
      
      if (temMeta || temNow || temForecast) {
        closersAtivos.set(vendedor, {
          vendedor,
          ownerId,
          meta,
          valorAcumulado,
          reunioes,
          forecastsHoje,
          items,
        });
      }
    });

    // Converter para array e ordenar alfabeticamente
    return Array.from(closersAtivos.values()).sort((a, b) => {
      return a.vendedor.localeCompare(b.vendedor, 'pt-BR');
    });
  }, [negociacoesPorVendedor, metasMap, forecastsMap]);

  
  // Lista plana de todas as negociações (apenas closers)
  const todasNegociacoes = useMemo(() => {
    return vendedoresClosers.flatMap(v => v.items);
  }, [vendedoresClosers]);

  // Valores acumulados vêm apenas das metas via WebSocket
  // Não buscamos do banco - todas as atualizações vêm via WebSocket (handleMetasUpdated)

  // Calcular meta total, valor acumulado total e total de reuniões do time
  const teamStats = useMemo(() => {
    let metaTotal = 0;
    let valorAcumuladoTotal = 0;
    let totalReunioes = 0;
    
    metasMap.forEach((meta) => {
      metaTotal += meta.meta;
      valorAcumuladoTotal += meta.valor_acumulado;
      totalReunioes += (meta.qtd_reunioes ?? 0);
    });
    // valor_acumulado e qtd_reunioes vêm apenas do WebSocket (metasMap) - não buscar do banco
    
    return {
      metaTotal,
      valorAcumuladoTotal,
      vendedoresCount: metasMap.size,
      totalReunioes,
    };
  }, [metasMap]);
  
  // Sempre mostrar loading inicial para evitar erro de hidratação
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [finalizarDiaOpen, setFinalizarDiaOpen] = useState(false);

  // Ref para rastrear atualizações processadas e evitar loops
  const processedUpdatesRef = useRef<Set<string>>(new Set());
  const dealsNowMapRef = useRef<Map<string, Negociacao>>(new Map());
  // Atualizar ref quando o Map mudar
  useEffect(() => {
    dealsNowMapRef.current = dealsNowMap;
  }, [dealsNowMap]);
  
  // Handler para receber estado de metas do servidor
  // Faz merge com dados existentes para não perder valor_acumulado do resumo-dia quando o servidor envia metas vazias (ex: após restart)
  const handleMetasUpdated = useCallback((state: Array<[string, MetaDiaria]>) => {
    console.log('📡 [PAINEL] Estado de metas recebido do servidor:', state.length, 'metas');
    setMetasMap((prevMap) => {
      const newMetasMap = new Map<string, MetaDiaria>();
      // Primeiro: adicionar metas do servidor (prioridade)
      state.forEach(([vendedorId, meta]) => {
        newMetasMap.set(vendedorId, meta);
      });
      // Segundo: preservar vendedores com valor_acumulado do resumo-dia que não estão no servidor
      prevMap.forEach((meta, vendedorId) => {
        if (!newMetasMap.has(vendedorId) && (meta.valor_acumulado > 0 || (meta.qtd_reunioes ?? 0) > 0)) {
          newMetasMap.set(vendedorId, meta);
        }
      });
      return newMetasMap;
    });
  }, []);

  // Handler para receber alerta de hora próxima (broadcast a cada 1s pelo backend)
  const handleAlertaHoraProxima = useCallback((alertas: Array<{ vendedorId: string; forecast: Forecast; countdown: { minutos: number; segundos: number } }>) => {
    const newMap = new Map<string, { forecast: Forecast; countdown: { minutos: number; segundos: number } }>();
    alertas.forEach((a) => newMap.set(a.vendedorId, { forecast: a.forecast, countdown: a.countdown }));
    setAlertaMap(newMap);
  }, []);

  // Handler para receber estado de forecasts do servidor
  const handleForecastsUpdated = useCallback((state: Array<[string, any[]]>) => {
    console.log('📡 [PAINEL] Estado de forecasts recebido do servidor:', state.length, 'vendedores');
    const newForecastsMap = new Map<string, Forecast[]>();
    state.forEach(([vendedorId, forecasts]) => {
      // Garantir que todos os forecasts tenham classificacao e estejam no formato correto
      const forecastsComClassificacao: Forecast[] = forecasts.map((f: any) => ({
        id: String(f.id || ''),
        vendedorId: String(f.vendedorId || ''),
        closerNome: String(f.closerNome || ''),
        clienteNome: String(f.clienteNome || ''),
        clienteNumero: String(f.clienteNumero || ''),
        data: String(f.data || ''),
        horario: String(f.horario || ''),
        valor: Number(f.valor) || 0,
        observacoes: String(f.observacoes || ''),
        primeiraCall: String(f.primeiraCall || ''),
        negociacaoId: f.negociacaoId ? String(f.negociacaoId) : undefined,
        classificacao: (f.classificacao as 'quente' | 'morno' | 'frio') || 'morno',
        createdAt: String(f.createdAt || ''),
        updatedAt: String(f.updatedAt || ''),
      }));
      newForecastsMap.set(vendedorId, forecastsComClassificacao);
    });
    setForecastsMap(newForecastsMap);
  }, []);

  // Carregar dados iniciais via GET apenas no refresh/carregamento da página.
  // Forecasts vêm exclusivamente via WebSocket (handleForecastsUpdated) - evita race com API e garante alerta em tempo real.
  // valor_acumulado e qtd_reunioes vêm apenas via WebSocket (handleMetasUpdated).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadInitialData = async () => {
      try {
        // Buscar apenas deals now - forecasts vêm via WebSocket ao conectar
        const dealsNowRes = await fetch('/api/deals/now');

        // Processar deals now
        const dealsJson = await dealsNowRes.json();
        const dealsData = dealsJson.data || [];
        if (Array.isArray(dealsData) && dealsData.length > 0) {
          const newDealsMap = new Map<string, Negociacao>();
          dealsData.forEach((deal: { id?: string; name?: string; owner_id?: string; status?: string; custom_fields?: Record<string, unknown>; total_price?: number }) => {
            const dealId = deal.id;
            if (!dealId) return;
            const numero =
              (deal.custom_fields?.numero as string) ||
              (deal.custom_fields?.telefone as string) ||
              (deal.custom_fields?.phone as string) ||
              '';
            const negociacao: Negociacao = {
              id: dealId,
              cliente: deal.name || '',
              numero: numero || '',
              status: mapRdStatusToInternal((deal.status as string) || (deal.custom_fields?.status as string) || 'open'),
              isNow: true,
              tarefa: (deal.custom_fields?.tarefa as string) || '',
              valor: deal.total_price || 0,
              tipo: tipoBloco,
              vendedor: deal.owner_id ? getVendedorNameById(deal.owner_id) || 'Desconhecido' : 'Desconhecido',
            };
            newDealsMap.set(dealId, negociacao);
          });
          setDealsNowMap(newDealsMap);
          console.log('📂 [PAINEL] Deals now carregados via API:', newDealsMap.size);
        }
      } catch (err) {
        console.error('❌ [PAINEL] Erro ao carregar dados iniciais:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);


  // Salvar no localStorage sempre que o Map mudar (apenas no cliente)
  // Salvar mesmo quando vazio para limpar dados antigos se necessário
  useEffect(() => {
    if (typeof window !== 'undefined') {
      saveDealsMapToLocalStorage(dealsNowMap);
    }
  }, [dealsNowMap]);

  // Salvar forecasts no localStorage sempre que mudarem
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const forecastsKey = 'painel_forecasts_map';
      try {
        const forecastsArray = Array.from(forecastsMap.entries());
        localStorage.setItem(forecastsKey, JSON.stringify(forecastsArray));
      } catch (error) {
        console.error('❌ [PAINEL] Erro ao salvar forecasts no localStorage:', error);
      }
    }
  }, [forecastsMap]);

  // Função para buscar uma deal específica e adicionar ao Map
  // Remove automaticamente outras deals do mesmo vendedor (só pode haver uma "now" por vendedor)
  const fetchAndAddDeal = useCallback(async (dealId: string, ownerId?: string, dealData?: { cliente_nome?: string; cliente_numero?: string; valor?: number }) => {
    try {
      console.log('📋 [PAINEL] Buscando deal específica:', dealId);
      
      const response = await fetch(`/api/deals/${dealId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [PAINEL] Erro ao buscar deal:', errorData.errors?.[0]?.detail);
        return null;
      }

      const result = await response.json();
      const deal = result.data;

      if (!deal) {
        console.error('❌ [PAINEL] Deal não encontrado');
        return null;
      }

      // Mapear deal para o formato interno
        // Tentar múltiplos campos possíveis para o número de telefone
        const numero = 
          deal.custom_fields?.numero || 
          deal.custom_fields?.telefone || 
          deal.custom_fields?.phone ||
          deal.custom_fields?.celular ||
          deal.custom_fields?.mobile ||
          deal.custom_fields?.whatsapp ||
          deal.contacts?.[0]?.phones?.[0]?.phone ||
          deal.contact?.phones?.[0]?.phone ||
          '';
        
        const negociacaoMapeada: Negociacao = {
          id: deal.id,
          cliente: deal.name,
          numero: numero,
          status: mapRdStatusToInternal(deal.status),
          isNow: true,
          tarefa: deal.custom_fields?.tarefa || '',
          valor: deal.total_price || 0,
          tipo: tipoBloco,
          vendedor: ownerId ? getVendedorNameById(ownerId) || 'Desconhecido' : 'Desconhecido',
        };

      console.log('✅ [PAINEL] Deal mapeada:', negociacaoMapeada);

      // Atualizar o Map: remover outras deals do mesmo vendedor e adicionar a nova
      setDealsNowMap((prevMap) => {
        const newMap = new Map(prevMap);
        
        // Remover todas as deals do mesmo vendedor
        const vendedorName = negociacaoMapeada.vendedor;
        prevMap.forEach((neg, id) => {
          if (neg.vendedor === vendedorName) {
            newMap.delete(id);
          }
        });
        
        // Adicionar a nova deal
        newMap.set(dealId, negociacaoMapeada);
        
        console.log(`🔄 [PAINEL] Substituindo deals do vendedor ${vendedorName} pela nova deal ${dealId}`);
        return newMap;
      });

      return negociacaoMapeada;
    } catch (err: any) {
      console.error('❌ [PAINEL] Erro ao buscar deal:', err);
      return null;
    }
  }, []);

  // Handler para receber estado completo do servidor (quando conecta ou após refresh)
  const handleDashboardUpdated = useCallback(async (state: Array<[string, any]>) => {
    console.log('📡 [PAINEL] Estado completo recebido do servidor:', state.length, 'deals');
    
    if (state.length === 0) {
      console.log('ℹ️ [PAINEL] Nenhum deal "now" no estado do servidor - limpando dados');
      // Limpar dados quando o servidor não enviar nenhum deal "now"
      setDealsNowMap(new Map());
      // Limpar também do localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY);
          console.log('🧹 [PAINEL] Dados antigos removidos do localStorage');
        } catch (error) {
          console.error('❌ [PAINEL] Erro ao limpar localStorage:', error);
        }
      }
      setLoading(false);
      return;
    }

    // Criar novo Map com os deals recebidos
    const newDealsMap = new Map<string, Negociacao>();
    
    // Buscar cada deal completo pelos IDs
    const dealsPromises = state.map(async ([dealId, dealData]: [string, any]) => {
      try {
        // Se for deal manual (começa com "manual_"), criar negociação diretamente dos dados do WebSocket
        if (dealId.startsWith('manual_')) {
          const negociacao: Negociacao = {
            id: dealId,
            cliente: dealData.cliente_nome || 'Cliente',
            numero: dealData.cliente_numero || '',
            status: 'negociacao', // Status padrão para calls manuais
            isNow: true,
            tarefa: '',
            valor: dealData.valor || 0,
            tipo: tipoBloco,
            vendedor: dealData.owner_id ? getVendedorNameById(dealData.owner_id) || 'Desconhecido' : 'Desconhecido',
          };
          return { dealId, negociacao };
        }

        // Para deals do RD Station, buscar via API
        const response = await fetch(`/api/deals/${dealId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn(`⚠️ [PAINEL] Erro ao buscar deal ${dealId}`);
          return null;
        }

        const result = await response.json();
        const deal = result.data;

        if (!deal) {
          console.warn(`⚠️ [PAINEL] Deal ${dealId} não encontrado`);
          return null;
        }

        // Tentar múltiplos campos possíveis para o número de telefone
        const numero = 
          deal.custom_fields?.numero || 
          deal.custom_fields?.telefone || 
          deal.custom_fields?.phone ||
          deal.custom_fields?.celular ||
          deal.custom_fields?.mobile ||
          deal.custom_fields?.whatsapp ||
          deal.contacts?.[0]?.phones?.[0]?.phone ||
          deal.contact?.phones?.[0]?.phone ||
          '';
        
        const negociacao: Negociacao = {
          id: deal.id,
          cliente: deal.name,
          numero: numero,
          status: mapRdStatusToInternal(deal.status),
          isNow: true,
          tarefa: deal.custom_fields?.tarefa || '',
          valor: deal.total_price || 0,
          tipo: tipoBloco,
          vendedor: dealData?.owner_id ? getVendedorNameById(dealData.owner_id) || 'Desconhecido' : getVendedorNameById(deal.owner_id || '') || 'Desconhecido',
        };

        return { dealId, negociacao };
      } catch (error) {
        console.error(`❌ [PAINEL] Erro ao buscar deal ${dealId}:`, error);
        return null;
      }
    });

    const dealsResults = await Promise.all(dealsPromises);
    const validDeals = dealsResults.filter((result) => result !== null);

    // Adicionar deals ao Map
    validDeals.forEach((result) => {
      if (result) {
        newDealsMap.set(result.dealId, result.negociacao);
      }
    });

    console.log(`✅ [PAINEL] ${validDeals.length} deals carregados do estado do servidor`);
    // Se recebemos dados reais do servidor, atualizar o estado
    if (validDeals.length > 0) {
      setDealsNowMap(newDealsMap);
    } else {
      // Se não conseguimos carregar nenhum deal, manter os dados existentes
      console.log('ℹ️ [PAINEL] Nenhum deal válido carregado, mantendo dados existentes');
      setDealsNowMap((prevMap) => prevMap);
    }
    setLoading(false);
  }, []);

  // WebSocket para receber atualizações em tempo real
  const handleDealUpdate = useCallback(async (data: { deal_id: string; is_now: boolean; updated_at: string; owner_id?: string; cliente_nome?: string; cliente_numero?: string; valor?: number }) => {
    // Criar chave única para esta atualização
    const updateKey = `${data.deal_id}-${data.updated_at}`;
    
    // Evitar processar a mesma atualização múltiplas vezes
    if (processedUpdatesRef.current.has(updateKey)) {
      console.log('⚠️ [PAINEL] Atualização já processada, ignorando:', updateKey);
      return;
    }
    
    processedUpdatesRef.current.add(updateKey);
    console.log('📡 [PAINEL] Atualização recebida via WebSocket:', data);
    
    // Se o deal foi marcado como "now", buscar apenas essa deal e renderizar seu card
    if (data.is_now) {
      console.log('🔄 [PAINEL] Buscando deal específica para renderizar card...');
      // Passar dados adicionais para deals manuais
      const dealData = data.deal_id.startsWith('manual_') ? {
        cliente_nome: data.cliente_nome,
        cliente_numero: data.cliente_numero,
        valor: data.valor,
      } : undefined;
      await fetchAndAddDeal(data.deal_id, data.owner_id, dealData);
    } else {
      // Se foi desmarcado, remover o deal do Map
      setDealsNowMap((prevMap) => {
        const newMap = new Map(prevMap);
        newMap.delete(data.deal_id);
        console.log(`🗑️ [PAINEL] Removendo deal ${data.deal_id} do Map`);
        return newMap;
      });
    }
    
    // Limpar atualizações antigas após 5 minutos para evitar acúmulo de memória
    setTimeout(() => {
      processedUpdatesRef.current.delete(updateKey);
    }, 5 * 60 * 1000);
  }, [fetchAndAddDeal]);

  const { isConnected: wsConnected } = useWebSocket({
    room: 'painel',
    onDealUpdate: handleDealUpdate,
    onDashboardUpdated: handleDashboardUpdated,
    onMetasUpdated: handleMetasUpdated,
    onForecastsUpdated: handleForecastsUpdated,
    onAlertaHoraProxima: handleAlertaHoraProxima,
    onConnected: () => {
      console.log('✅ [PAINEL] WebSocket conectado');
    },
    onError: (err) => {
      console.error('❌ [PAINEL] Erro WebSocket:', err);
    },
  });


  // Removido: loadDataFromNowFlag - não é necessário pois o WebSocket já envia o estado inicial
  // quando o cliente se conecta e emite 'join-painel', o servidor responde com 'dashboardUpdated'

  // Desabilitar scroll na página do painel
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.style.overflow = 'hidden';
      mainElement.style.height = '100vh';
      mainElement.style.maxHeight = '100vh';
    }
    
    // Também desabilitar scroll no body
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      // Restaurar scroll ao sair da página (opcional)
      if (mainElement) {
        mainElement.style.overflow = '';
        mainElement.style.height = '';
        mainElement.style.maxHeight = '';
      }
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <>
      <BackgroundLogo />
      <div className="relative z-10 h-screen flex flex-col w-full min-w-0 max-w-full overflow-hidden" style={{ padding: 'clamp(0.46rem, 0.92vw, 0.92rem)', height: '100vh', maxHeight: '100vh' }}>
        <div className="flex-shrink-0 mb-1 flex flex-col gap-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <h1 className="text-white font-bold" style={{ fontSize: 'clamp(1.587rem, 4.761vw, 2.3805rem)' }}>
                Painel de Negociações
              </h1>
              <p className="text-[#CCCCCC] mt-0" style={{ fontSize: 'clamp(1.0910625rem, 2.3805vw, 1.388625rem)' }}>
                Negociações em andamento
              </p>
            </div>
            <Button
              onClick={() => setFinalizarDiaOpen(true)}
              className="bg-[#fed094] text-[#1A1A1A] hover:bg-[#fed094]/90 flex items-center gap-2 self-start sm:self-auto"
              style={{ fontSize: 'clamp(0.69rem, 0.92vw, 0.805rem)', padding: 'clamp(0.345rem, 0.69vw, 0.46rem) clamp(0.69rem, 0.92vw, 0.92rem)' }}
            >
              <FileBarChart style={{ width: 'clamp(0.805rem, 1.104vw, 0.92rem)', height: 'clamp(0.805rem, 1.104vw, 0.92rem)' }} />
              Finalizar dia
            </Button>
          </div>
          {/* Relógio centralizado */}
          <div className="flex justify-center w-full">
            <Clock />
          </div>
        </div>

        <FinalizarDiaDialog open={finalizarDiaOpen} onOpenChange={setFinalizarDiaOpen} />

        {/* Acompanhamento do Time - Sempre exibido */}
        {!loading && !error && (
          <div className="flex-shrink-0 mb-1">
            <TeamOverview
              metaTotal={teamStats.metaTotal || 0}
              valorAcumuladoTotal={teamStats.valorAcumuladoTotal || 0}
              vendedoresCount={teamStats.vendedoresCount || 0}
              totalReunioes={teamStats.totalReunioes || 0}
            />
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center min-h-0 w-full">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-[#fed094]" style={{ width: 'clamp(1.6928rem, 2.5392vw, 2.5392rem)', height: 'clamp(1.6928rem, 2.5392vw, 2.5392rem)' }} />
              <p className="text-[#CCCCCC] text-center" style={{ fontSize: 'clamp(0.7406rem, 1.2696vw, 0.9522rem)' }}>
                Carregando negociações...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center min-h-0 w-full">
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-300 text-center" style={{ fontSize: 'clamp(0.7406rem, 1.01568vw, 0.8464rem)' }}>
                ⚠️ {error}
              </p>
            </div>
          </div>
        ) : todasNegociacoes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-0 w-full">
            <p className="text-[#CCCCCC] text-center" style={{ fontSize: 'clamp(0.7406rem, 1.2696vw, 0.9522rem)' }}>
              Nenhuma negociação em andamento no momento.
            </p>
          </div>
        ) : (
          <>
            {/* Bloco Closers - Em cima */}
            <div className="flex-1 flex flex-col gap-1 w-full min-h-0 overflow-hidden">
          
              {vendedoresClosers.length === 0 ? (
                <p className="text-[#CCCCCC] text-center py-8" style={{ fontSize: 'clamp(0.7406rem, 1.2696vw, 0.8464rem)' }}>
                  Nenhum Closer cadastrado.
                </p>
              ) : (
                (() => {
                  const totalItems = vendedoresClosers.length;
                  const itemsInLastRow = totalItems % 3;
                  const hasIncompleteRow = itemsInLastRow > 0 && itemsInLastRow < 3;
                  const completeRows = Math.floor(totalItems / 3);
                  const itemsInCompleteRows = completeRows * 3;
                  
                  return (
                    <div 
                      className="w-full flex-1 min-h-0 flex flex-col"
                      style={{
                        overflow: 'hidden',
                        height: '100%',
                      }}
                    >
                      {/* Linhas completas */}
                      {completeRows > 0 && (
                        <div 
                          className="w-full"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gridAutoRows: '1fr',
                            gap: 'clamp(4rem, 8vw, 8rem)',
                            marginBottom: hasIncompleteRow ? 'clamp(4rem, 8vw, 8rem)' : '0',
                          }}
                        >
                          {vendedoresClosers.slice(0, itemsInCompleteRows).map(({ vendedor, ownerId, items, meta, valorAcumulado, reunioes, forecastsHoje }) => (
                            <CloserCard
                              key={`closer-${vendedor}`}
                              vendedor={vendedor}
                              ownerId={ownerId}
                              meta={meta}
                              valorAcumulado={valorAcumulado}
                              reunioes={reunioes}
                              forecastsHoje={forecastsHoje}
                              alerta={alertaMap.get(ownerId) ?? null}
                              items={items}
                              statusConfig={statusConfig}
                              formatCurrency={formatCurrency}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* Última linha incompleta - centralizada */}
                      {hasIncompleteRow && (
                        <div 
                          className="w-full"
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 'clamp(4rem, 8vw, 8rem)',
                            alignItems: 'stretch',
                          }}
                        >
                          {vendedoresClosers.slice(itemsInCompleteRows).map(({ vendedor, ownerId, items, meta, valorAcumulado, reunioes, forecastsHoje }) => (
                            <div key={`closer-${vendedor}`} style={{ flex: '0 1 calc(33.333% - clamp(4rem, 8vw, 8rem))', maxWidth: 'calc(33.333% - clamp(4rem, 8vw, 8rem))' }}>
                              <CloserCard
                                vendedor={vendedor}
                                ownerId={ownerId}
                                meta={meta}
                                valorAcumulado={valorAcumulado}
                                reunioes={reunioes}
                                forecastsHoje={forecastsHoje}
                                alerta={alertaMap.get(ownerId) ?? null}
                                items={items}
                                statusConfig={statusConfig}
                                formatCurrency={formatCurrency}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

          </>
        )}
      </div>
    </>
  );
}
