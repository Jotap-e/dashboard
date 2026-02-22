'use client';

import { BackgroundLogo } from '@/components/ui/background-logo';
import { StackedCards } from '@/components/painel/stacked-cards';
import { BlocoLabel } from '@/components/painel/bloco-label';
import { VendedorMetaCard } from '@/components/painel/vendedor-meta-card';
import { TeamOverview } from '@/components/painel/team-overview';
import { NegociacaoCard } from '@/components/painel/negociacao-card';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Loader2 } from 'lucide-react';
import { StatusNegociacao, TipoBloco, Negociacao } from '@/lib/types/negociacoes';
import { VENDEDOR_IDS } from '@/lib/utils/vendedores';
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
  updated_at: string;
}

export default function PainelPage() {
  // Map para rastrear deals com flag "now" (deal_id -> Negociacao)
  // Inicializar vazio para evitar erro de hidratação (localStorage não existe no servidor)
  const [dealsNowMap, setDealsNowMap] = useState<Map<string, Negociacao>>(new Map());
  
  // Map para rastrear metas diárias (vendedor_id -> MetaDiaria)
  const [metasMap, setMetasMap] = useState<Map<string, MetaDiaria>>(new Map());
  
  // Converter Map para formato de renderização
  const negociacoesPorVendedor = useMemo(() => {
    return mapToNegociacoesPorVendedor(dealsNowMap);
  }, [dealsNowMap]);

  // Calcular valores acumulados por vendedor baseado nos deals "now"
  const valoresAcumuladosPorVendedor = useMemo(() => {
    const valores = new Map<string, number>();
    
    negociacoesPorVendedor.forEach(({ vendedor, negociacoes }) => {
      const total = negociacoes.reduce((sum, neg) => sum + (neg.valor || 0), 0);
      // Obter owner_id do vendedor
      const ownerId = VENDEDOR_IDS[vendedor];
      if (ownerId) {
        valores.set(ownerId, total);
      }
    });
    
    return valores;
  }, [negociacoesPorVendedor]);

  // Lista plana de todas as negociações para exibir em coluna única
  const todasNegociacoes = useMemo(() => {
    const lista: Array<{ negociacao: Negociacao; vendedor: string; meta: MetaDiaria | null; valorAcumulado: number }> = [];
    
    negociacoesPorVendedor.forEach(({ vendedor, negociacoes }) => {
      const ownerId = VENDEDOR_IDS[vendedor];
      const meta = ownerId ? (metasMap.get(ownerId) || null) : null;
      const valorAcumulado = ownerId ? (valoresAcumuladosPorVendedor.get(ownerId) || 0) : 0;
      
      negociacoes.forEach((negociacao) => {
        lista.push({
          negociacao,
          vendedor,
          meta,
          valorAcumulado,
        });
      });
    });
    
    return lista;
  }, [negociacoesPorVendedor, metasMap, valoresAcumuladosPorVendedor]);

  // Atualizar valores acumulados nas metas quando os deals mudarem
  useEffect(() => {
    setMetasMap((prevMetas) => {
      const newMetas = new Map(prevMetas);
      valoresAcumuladosPorVendedor.forEach((valor, ownerId) => {
        const meta = newMetas.get(ownerId);
        if (meta) {
          newMetas.set(ownerId, {
            ...meta,
            valor_acumulado: valor,
          });
        }
      });
      return newMetas;
    });
  }, [valoresAcumuladosPorVendedor]);
  
  // Calcular meta total e valor acumulado total do time
  const teamStats = useMemo(() => {
    let metaTotal = 0;
    let valorAcumuladoTotal = 0;
    
    metasMap.forEach((meta) => {
      metaTotal += meta.meta;
      valorAcumuladoTotal += meta.valor_acumulado;
    });
    
    return {
      metaTotal,
      valorAcumuladoTotal,
      vendedoresCount: metasMap.size,
    };
  }, [metasMap]);
  
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
  
  // Carregar do localStorage apenas no cliente (após hidratação)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadedMap = loadDealsMapFromLocalStorage();
      if (loadedMap.size > 0) {
        console.log('📂 [PAINEL] Carregando dados do localStorage após hidratação:', loadedMap.size, 'deals');
        setDealsNowMap(loadedMap);
        setLoading(false);
      } else {
        console.log('📂 [PAINEL] Nenhum dado encontrado no localStorage');
      }
    }
  }, []); // Executa apenas uma vez após mount

  // Salvar no localStorage sempre que o Map mudar (apenas no cliente)
  // Salvar mesmo quando vazio para limpar dados antigos se necessário
  useEffect(() => {
    if (typeof window !== 'undefined') {
      saveDealsMapToLocalStorage(dealsNowMap);
    }
  }, [dealsNowMap]);

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
      const negociacaoMapeada: Negociacao = {
        id: deal.id,
        cliente: deal.name,
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
      console.log('ℹ️ [PAINEL] Nenhum deal "now" no estado do servidor');
      setDealsNowMap(new Map());
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

        const negociacao: Negociacao = {
          id: deal.id,
          cliente: deal.name,
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
    setDealsNowMap(newDealsMap);
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
            {/* Acompanhamento do Time */}
            {teamStats.vendedoresCount > 0 && (
              <TeamOverview
                metaTotal={teamStats.metaTotal}
                valorAcumuladoTotal={teamStats.valorAcumuladoTotal}
                vendedoresCount={teamStats.vendedoresCount}
              />
            )}

            {/* Coluna única de cards */}
            <div className="flex-1 flex flex-col gap-1 w-full" style={{ maxWidth: 'clamp(280px, 60vw, 420px)' }}>
              {todasNegociacoes.map((item, index) => {
                const { negociacao, vendedor, meta, valorAcumulado } = item;
                const isFirstOfVendedor = index === 0 || todasNegociacoes[index - 1].vendedor !== vendedor;
                
                return (
                  <div key={`${vendedor}-${negociacao.id}`} className="flex flex-col">
                    {/* Header do vendedor (apenas na primeira negociação do vendedor) */}
                    {isFirstOfVendedor && (
                      <>
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

                        {/* Card de Meta (apenas na primeira negociação do vendedor) */}
                        {meta && (
                          <div className="mb-0.5">
                            <VendedorMetaCard
                              vendedorNome={vendedor}
                              meta={meta.meta}
                              valorAcumulado={valorAcumulado}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Card da Negociação */}
                    <div className="w-full" style={{ minHeight: 'clamp(200px, 35vh, 320px)' }}>
                      <NegociacaoCard negociacao={negociacao} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
