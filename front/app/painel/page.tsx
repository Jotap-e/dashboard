'use client';

import { BackgroundLogo } from '@/components/ui/background-logo';
import { StackedCards } from '@/components/painel/stacked-cards';
import { BlocoLabel } from '@/components/painel/bloco-label';
import { VendedorMetaCard } from '@/components/painel/vendedor-meta-card';
import { TeamOverview } from '@/components/painel/team-overview';
import { ForecastTable } from '@/components/painel/forecast-table';
import { Forecast } from '@/lib/types/forecast';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Loader2, Phone, DollarSign, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusNegociacao, TipoBloco, Negociacao } from '@/lib/types/negociacoes';
import { VENDEDOR_IDS, getVendedorTipo } from '@/lib/utils/vendedores';
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

interface MetaDiaria {
  vendedor_id: string;
  vendedor_nome: string;
  meta: number;
  valor_acumulado: number;
  qtd_reunioes: number;
  updated_at: string;
}

export default function PainelPage() {
  // Map para rastrear deals com flag "now" (deal_id -> Negociacao)
  // Inicializar vazio para evitar erro de hidratação (localStorage não existe no servidor)
  const [dealsNowMap, setDealsNowMap] = useState<Map<string, Negociacao>>(new Map());
  
  // Map para rastrear metas diárias (vendedor_id -> MetaDiaria)
  const [metasMap, setMetasMap] = useState<Map<string, MetaDiaria>>(new Map());
  
  // Map para rastrear forecasts por vendedor (vendedor_id -> Forecast[])
  const [forecastsMap, setForecastsMap] = useState<Map<string, Forecast[]>>(new Map());
  
  // Converter Map para formato de renderização
  const negociacoesPorVendedor = useMemo(() => {
    return mapToNegociacoesPorVendedor(dealsNowMap);
  }, [dealsNowMap]);

  // Valores acumulados vêm das metas (atualizados quando o closer marca como vendido)
  // Não calcular mais baseado nos deals "now", usar o valor_acumulado das metas

  // Calcular reuniões por vendedor (cada "now" = 1 reunião)
  const reunioesPorVendedor = useMemo(() => {
    const reunioes = new Map<string, number>();
    
    negociacoesPorVendedor.forEach(({ vendedor, negociacoes }) => {
      const ownerId = VENDEDOR_IDS[vendedor];
      if (ownerId) {
        // Cada negociação "now" conta como uma reunião
        reunioes.set(ownerId, negociacoes.length);
      }
    });
    
    return reunioes;
  }, [negociacoesPorVendedor]);

  // Agrupar negociações por vendedor (apenas Closers)
  // Também incluir closers que têm forecasts mesmo sem negociações "now"
  const vendedoresClosers = useMemo(() => {
    // Agrupar por vendedor
    const closersMap = new Map<string, Array<{ negociacao: Negociacao; vendedor: string; meta: MetaDiaria | null; valorAcumulado: number; reunioes: number }>>();
    
    negociacoesPorVendedor.forEach(({ vendedor, negociacoes }) => {
      const ownerId = VENDEDOR_IDS[vendedor];
      const meta = ownerId ? (metasMap.get(ownerId) || null) : null;
      // Usar valor_acumulado das metas (atualizado quando o closer marca como vendido)
      const valorAcumulado = meta?.valor_acumulado || 0;
      const reunioes = ownerId ? (reunioesPorVendedor.get(ownerId) || 0) : 0;
      const tipo = getVendedorTipo(vendedor);
      
      // Apenas processar closers
      if (tipo === 'closer') {
        negociacoes.forEach((negociacao) => {
          const item = {
            negociacao,
            vendedor,
            meta,
            valorAcumulado,
            reunioes,
          };
          
          if (!closersMap.has(vendedor)) {
            closersMap.set(vendedor, []);
          }
          closersMap.get(vendedor)!.push(item);
        });
      }
    });
    
    // Adicionar closers que têm forecasts para hoje, mesmo sem negociações "now"
    const hoje = new Date().toISOString().split('T')[0];
    forecastsMap.forEach((forecasts, ownerId) => {
      const forecastsHoje = forecasts.filter(f => f.data === hoje);
      if (forecastsHoje.length > 0) {
        // Encontrar o nome do vendedor pelo ownerId
        const vendedorNome = getVendedorNameById(ownerId);
        if (vendedorNome && getVendedorTipo(vendedorNome) === 'closer') {
          // Se o closer não está no map ainda, adicionar com array vazio de items
          if (!closersMap.has(vendedorNome)) {
            closersMap.set(vendedorNome, []);
          }
        }
      }
    });
    
    // Adicionar closers que têm meta diária definida, mesmo sem negociações "now" ou forecasts
    metasMap.forEach((meta, ownerId) => {
      // Encontrar o nome do vendedor pelo ownerId
      const vendedorNome = getVendedorNameById(ownerId);
      if (vendedorNome && getVendedorTipo(vendedorNome) === 'closer') {
        // Se o closer não está no map ainda e tem meta definida, adicionar com array vazio de items
        if (!closersMap.has(vendedorNome) && meta.meta > 0) {
          closersMap.set(vendedorNome, []);
        }
      }
    });
    
    // Converter Map para array de vendedores
    const closers: Array<{ vendedor: string; items: Array<{ negociacao: Negociacao; vendedor: string; meta: MetaDiaria | null; valorAcumulado: number; reunioes: number }> }> = [];
    
    closersMap.forEach((items, vendedor) => {
      // Se items está vazio mas o vendedor tem meta ou forecasts, ainda incluir
      const ownerId = VENDEDOR_IDS[vendedor];
      const meta = ownerId ? (metasMap.get(ownerId) || null) : null;
      const forecasts = ownerId ? (forecastsMap.get(ownerId) || []) : [];
      const forecastsHoje = forecasts.filter(f => f.data === hoje);
      
      if (items.length > 0 || meta || forecastsHoje.length > 0) {
        closers.push({ vendedor, items });
      }
    });
    
    return closers;
  }, [negociacoesPorVendedor, metasMap, reunioesPorVendedor, forecastsMap]);

  // Distribuir vendedores em duas colunas (esquerda e direita)
  const distribuirEmColunas = <T,>(items: T[]): [T[], T[]] => {
    const colunaEsquerda: T[] = [];
    const colunaDireita: T[] = [];
    
    items.forEach((item, index) => {
      if (index % 2 === 0) {
        colunaEsquerda.push(item);
      } else {
        colunaDireita.push(item);
      }
    });
    
    return [colunaEsquerda, colunaDireita];
  };

  const [closersColunaEsquerda, closersColunaDireita] = useMemo(() => {
    return distribuirEmColunas(vendedoresClosers);
  }, [vendedoresClosers]);
  
  // Lista plana de todas as negociações (apenas closers)
  const todasNegociacoes = useMemo(() => {
    return vendedoresClosers.flatMap(v => v.items);
  }, [vendedoresClosers]);

  // Valores acumulados agora vêm diretamente das metas via WebSocket
  // Não precisamos mais atualizar baseado nos deals

  // Calcular meta total, valor acumulado total e total de reuniões do time
  const teamStats = useMemo(() => {
    let metaTotal = 0;
    let valorAcumuladoTotal = 0;
    let totalReunioes = 0;
    
    metasMap.forEach((meta) => {
      metaTotal += meta.meta;
      valorAcumuladoTotal += meta.valor_acumulado;
    });
    
    reunioesPorVendedor.forEach((count) => {
      totalReunioes += count;
    });
    
    return {
      metaTotal,
      valorAcumuladoTotal,
      vendedoresCount: metasMap.size,
      totalReunioes,
    };
  }, [metasMap, reunioesPorVendedor]);
  
  // Sempre mostrar loading inicial para evitar erro de hidratação
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref para rastrear atualizações processadas e evitar loops
  const processedUpdatesRef = useRef<Set<string>>(new Set());
  const dealsNowMapRef = useRef<Map<string, Negociacao>>(new Map());
  // Atualizar ref quando o Map mudar
  useEffect(() => {
    dealsNowMapRef.current = dealsNowMap;
  }, [dealsNowMap]);
  
  // Handler para receber estado de metas do servidor
  const handleMetasUpdated = useCallback((state: Array<[string, MetaDiaria]>) => {
    console.log('📡 [PAINEL] Estado de metas recebido do servidor:', state.length, 'metas');
    const newMetasMap = new Map<string, MetaDiaria>();
    state.forEach(([vendedorId, meta]) => {
      newMetasMap.set(vendedorId, meta);
    });
    setMetasMap(newMetasMap);
  }, []);

  // Handler para receber estado de forecasts do servidor
  const handleForecastsUpdated = useCallback((state: Array<[string, Forecast[]]>) => {
    console.log('📡 [PAINEL] Estado de forecasts recebido do servidor:', state.length, 'vendedores');
    const newForecastsMap = new Map<string, Forecast[]>();
    state.forEach(([vendedorId, forecasts]) => {
      newForecastsMap.set(vendedorId, forecasts);
    });
    setForecastsMap(newForecastsMap);
  }, []);

  // Carregar do localStorage apenas no cliente (após hidratação)
  // NOTA: Não carregar deals do localStorage aqui - aguardar dados do WebSocket
  // O localStorage será atualizado apenas quando recebermos dados válidos do servidor
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Carregar forecasts do localStorage
      const forecastsKey = 'painel_forecasts_map';
      try {
        const storedForecasts = localStorage.getItem(forecastsKey);
        if (storedForecasts) {
          const forecastsArray = JSON.parse(storedForecasts) as Array<[string, Forecast[]]>;
          const forecastsMap = new Map<string, Forecast[]>(forecastsArray);
          setForecastsMap(forecastsMap);
          console.log('📂 [PAINEL] Forecasts carregados do localStorage:', forecastsMap.size, 'vendedores');
        }
      } catch (error) {
        console.error('❌ [PAINEL] Erro ao carregar forecasts do localStorage:', error);
      }
      
      setLoading(false);
    }
  }, []); // Executa apenas uma vez após mount


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
  const fetchAndAddDeal = useCallback(async (dealId: string, ownerId?: string) => {
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
    const dealsPromises = state.map(async ([dealId, dealData]) => {
      try {
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
  const handleDealUpdate = useCallback(async (data: { deal_id: string; is_now: boolean; updated_at: string; owner_id?: string }) => {
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
      await fetchAndAddDeal(data.deal_id, data.owner_id);
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
    onConnected: () => {
      console.log('✅ [PAINEL] WebSocket conectado');
    },
    onError: (err) => {
      console.error('❌ [PAINEL] Erro WebSocket:', err);
    },
  });


  // Removido: loadDataFromNowFlag - não é necessário pois o WebSocket já envia o estado inicial
  // quando o cliente se conecta e emite 'join-painel', o servidor responde com 'dashboardUpdated'

  return (
    <>
      <BackgroundLogo />
      <div className="relative z-10 min-h-screen flex flex-col" style={{ padding: 'clamp(0.75rem, 1.5vw, 1.5rem)' }}>
        <div className="flex-shrink-0 mb-3 md:mb-4">
          <h1 className="text-white font-bold" style={{ fontSize: 'clamp(1.25rem, 4vw, 2rem)' }}>
            Painel de Negociações
          </h1>
          <p className="text-[#CCCCCC] mt-1 md:mt-2" style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>
            Negociações em andamento
          </p>
        </div>

        {/* Acompanhamento do Time - Sempre exibido */}
        {!loading && !error && (
          <TeamOverview
            metaTotal={teamStats.metaTotal || 0}
            valorAcumuladoTotal={teamStats.valorAcumuladoTotal || 0}
            vendedoresCount={teamStats.vendedoresCount || 0}
            totalReunioes={teamStats.totalReunioes || 0}
          />
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-[#fed094]" style={{ width: 'clamp(2rem, 3vw, 3rem)', height: 'clamp(2rem, 3vw, 3rem)' }} />
              <p className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)' }}>
                Carregando negociações...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-300" style={{ fontSize: 'clamp(0.875rem, 1.2vw, 1rem)' }}>
                ⚠️ {error}
              </p>
            </div>
          </div>
        ) : todasNegociacoes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)' }}>
              Nenhuma negociação em andamento no momento.
            </p>
          </div>
        ) : (
          <>
            {/* Bloco Closers - Em cima */}
            <div className="flex-1 flex flex-col gap-4 w-full mb-6">
              <div className="mb-2">
                <h2 className="text-white font-semibold" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
                  Closers
                </h2>
              </div>
              
              {vendedoresClosers.length === 0 ? (
                <p className="text-[#CCCCCC] text-center py-8" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                  Nenhuma negociação de Closer no momento.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {/* Coluna Esquerda */}
                  <div className="flex flex-col gap-1">
                    {closersColunaEsquerda.map(({ vendedor, items }) => {
                      const primeiroItem = items[0];
                      // Buscar meta, valorAcumulado e reunioes mesmo quando não há items
                      const ownerId = VENDEDOR_IDS[vendedor];
                      const meta = ownerId ? (metasMap.get(ownerId) || null) : null;
                      const valorAcumulado = meta?.valor_acumulado || 0;
                      const reunioes = ownerId ? (reunioesPorVendedor.get(ownerId) || 0) : 0;
                      
                      return (
                        <div key={`closer-left-${vendedor}`} className="flex flex-col mb-4">
                          {/* Header do vendedor */}
                          <Card className="mb-0.5 flex-shrink-0 bg-transparent border-none">
                            <CardHeader style={{ padding: 'clamp(0.5rem, 1vw, 0.75rem)' }}>
                              <div className="flex items-center gap-1.5 md:gap-2">
                                <User className="text-[#fed094] flex-shrink-0" style={{ width: 'clamp(1rem, 2.5vw, 1.5rem)', height: 'clamp(1rem, 2.5vw, 1.5rem)' }} />
                                <CardTitle className="text-white truncate" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.25rem)' }}>
                                  {vendedor}
                                </CardTitle>
                              </div>
                            </CardHeader>
                          </Card>

                          {/* Card de Meta */}
                          {meta && (
                            <div className="mb-0.5">
                              <VendedorMetaCard
                                vendedorNome={vendedor}
                                meta={meta.meta}
                                valorAcumulado={valorAcumulado}
                                reunioes={reunioes}
                              />
                            </div>
                          )}

                          {/* Tabela de Forecast */}
                          {(() => {
                            const ownerId = VENDEDOR_IDS[vendedor];
                            const forecasts = ownerId ? (forecastsMap.get(ownerId) || []) : [];
                            const hoje = new Date().toISOString().split('T')[0];
                            const forecastsHoje = forecasts.filter(f => f.data === hoje);
                            return forecastsHoje.length > 0 ? (
                              <div className="mb-0.5">
                                <ForecastTable forecasts={forecastsHoje} vendedorNome={vendedor} />
                              </div>
                            ) : null;
                          })()}

                          {/* Negociações "Now" */}
                          {items.map(({ negociacao }) => (
                            <div 
                              key={`closer-${vendedor}-${negociacao.id}`}
                              className={cn(
                                "w-full rounded-lg border-2 border-[#fed094] bg-[#1A1A1A]/80 shadow-lg shadow-[#fed094]/20",
                                "flex items-center gap-3 px-4 py-3 transition-all hover:bg-[#1A1A1A] mb-0.5"
                              )}
                              style={{ 
                                minHeight: 'clamp(60px, 8vh, 80px)',
                                borderWidth: '2px',
                              }}
                            >
                              <div 
                                className="flex-shrink-0 flex items-center justify-center bg-[#fed094] text-[#1A1A1A] rounded-md px-2 py-1"
                                style={{ animation: 'gentle-pulse 2s ease-in-out infinite' }}
                              >
                                <Check className="mr-1" style={{ width: 'clamp(0.875rem, 1.5vw, 1rem)', height: 'clamp(0.875rem, 1.5vw, 1rem)' }} />
                                <span className="font-bold" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)' }}>
                                  In call
                                </span>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="text-white font-semibold truncate" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.125rem)' }}>
                                  {negociacao.cliente}
                                </h3>
                              </div>
                              
                              <div className="flex-shrink-0">
                                {(() => {
                                  const statusInfo = statusConfig[negociacao.status] || { label: negociacao.status, variant: 'default' as const, color: '#6b7280' };
                                  return (
                                    <Badge 
                                      variant={statusInfo.variant} 
                                      className="flex-shrink-0" 
                                      style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)', padding: 'clamp(0.25rem, 0.5vw, 0.375rem) clamp(0.5rem, 0.8vw, 0.625rem)' }}
                                    >
                                      {statusInfo.label}
                                    </Badge>
                                  );
                                })()}
                              </div>
                              
                              {negociacao.numero && (
                                <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                                  <Phone className="text-[#CCCCCC]" style={{ width: 'clamp(0.875rem, 1.5vw, 1rem)', height: 'clamp(0.875rem, 1.5vw, 1rem)' }} />
                                  <span className="text-[#CCCCCC] truncate" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                                    {negociacao.numero}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <DollarSign className="text-[#fed094]" style={{ width: 'clamp(0.875rem, 1.5vw, 1rem)', height: 'clamp(0.875rem, 1.5vw, 1rem)' }} />
                                <span className="text-white font-bold" style={{ fontSize: 'clamp(0.875rem, 1.8vw, 1.125rem)' }}>
                                  {negociacao.valor && negociacao.valor > 0 
                                    ? formatCurrency(negociacao.valor)
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {/* Coluna Direita */}
                  <div className="flex flex-col gap-1">
                    {closersColunaDireita.map(({ vendedor, items }) => {
                      const primeiroItem = items[0];
                      // Buscar meta, valorAcumulado e reunioes mesmo quando não há items
                      const ownerId = VENDEDOR_IDS[vendedor];
                      const meta = ownerId ? (metasMap.get(ownerId) || null) : null;
                      const valorAcumulado = meta?.valor_acumulado || 0;
                      const reunioes = ownerId ? (reunioesPorVendedor.get(ownerId) || 0) : 0;
                      
                      return (
                        <div key={`closer-right-${vendedor}`} className="flex flex-col mb-4">
                          {/* Header do vendedor */}
                          <Card className="mb-0.5 flex-shrink-0 bg-transparent border-none">
                            <CardHeader style={{ padding: 'clamp(0.5rem, 1vw, 0.75rem)' }}>
                              <div className="flex items-center gap-1.5 md:gap-2">
                                <User className="text-[#fed094] flex-shrink-0" style={{ width: 'clamp(1rem, 2.5vw, 1.5rem)', height: 'clamp(1rem, 2.5vw, 1.5rem)' }} />
                                <CardTitle className="text-white truncate" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.25rem)' }}>
                                  {vendedor}
                                </CardTitle>
                              </div>
                            </CardHeader>
                          </Card>

                          {/* Card de Meta */}
                          {meta && (
                            <div className="mb-0.5">
                              <VendedorMetaCard
                                vendedorNome={vendedor}
                                meta={meta.meta}
                                valorAcumulado={valorAcumulado}
                                reunioes={reunioes}
                              />
                            </div>
                          )}

                          {/* Tabela de Forecast */}
                          {(() => {
                            const ownerId = VENDEDOR_IDS[vendedor];
                            const forecasts = ownerId ? (forecastsMap.get(ownerId) || []) : [];
                            const hoje = new Date().toISOString().split('T')[0];
                            const forecastsHoje = forecasts.filter(f => f.data === hoje);
                            return forecastsHoje.length > 0 ? (
                              <div className="mb-0.5">
                                <ForecastTable forecasts={forecastsHoje} vendedorNome={vendedor} />
                              </div>
                            ) : null;
                          })()}

                          {/* Negociações "Now" */}
                          {items.map(({ negociacao }) => (
                            <div 
                              key={`closer-${vendedor}-${negociacao.id}`}
                              className={cn(
                                "w-full rounded-lg border-2 border-[#fed094] bg-[#1A1A1A]/80 shadow-lg shadow-[#fed094]/20",
                                "flex items-center gap-3 px-4 py-3 transition-all hover:bg-[#1A1A1A] mb-0.5"
                              )}
                              style={{ 
                                minHeight: 'clamp(60px, 8vh, 80px)',
                                borderWidth: '2px',
                              }}
                            >
                              <div 
                                className="flex-shrink-0 flex items-center justify-center bg-[#fed094] text-[#1A1A1A] rounded-md px-2 py-1"
                                style={{ animation: 'gentle-pulse 2s ease-in-out infinite' }}
                              >
                                <Check className="mr-1" style={{ width: 'clamp(0.875rem, 1.5vw, 1rem)', height: 'clamp(0.875rem, 1.5vw, 1rem)' }} />
                                <span className="font-bold" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)' }}>
                                  In call
                                </span>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="text-white font-semibold truncate" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.125rem)' }}>
                                  {negociacao.cliente}
                                </h3>
                              </div>
                              
                              <div className="flex-shrink-0">
                                {(() => {
                                  const statusInfo = statusConfig[negociacao.status] || { label: negociacao.status, variant: 'default' as const, color: '#6b7280' };
                                  return (
                                    <Badge 
                                      variant={statusInfo.variant} 
                                      className="flex-shrink-0" 
                                      style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)', padding: 'clamp(0.25rem, 0.5vw, 0.375rem) clamp(0.5rem, 0.8vw, 0.625rem)' }}
                                    >
                                      {statusInfo.label}
                                    </Badge>
                                  );
                                })()}
                              </div>
                              
                              {negociacao.numero && (
                                <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                                  <Phone className="text-[#CCCCCC]" style={{ width: 'clamp(0.875rem, 1.5vw, 1rem)', height: 'clamp(0.875rem, 1.5vw, 1rem)' }} />
                                  <span className="text-[#CCCCCC] truncate" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                                    {negociacao.numero}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <DollarSign className="text-[#fed094]" style={{ width: 'clamp(0.875rem, 1.5vw, 1rem)', height: 'clamp(0.875rem, 1.5vw, 1rem)' }} />
                                <span className="text-white font-bold" style={{ fontSize: 'clamp(0.875rem, 1.8vw, 1.125rem)' }}>
                                  {negociacao.valor && negociacao.valor > 0 
                                    ? formatCurrency(negociacao.valor)
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </>
        )}
      </div>
    </>
  );
}
