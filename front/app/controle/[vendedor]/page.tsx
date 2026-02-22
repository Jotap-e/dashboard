'use client';

import React from 'react';
import { BackgroundLogo } from '@/components/ui/background-logo';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetaInput } from '@/components/controle/meta-input';
import { Negociacao } from '@/lib/types/negociacoes';
import { DollarSign, Check, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVendedorId, VENDEDOR_IDS, slugToVendedorName } from '@/lib/utils/vendedores';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

const statusConfig: Record<Negociacao['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; color: string }> = {
  indicacao: { label: 'Indicação', variant: 'default', color: '#3b82f6' },
  conectado: { label: 'Conectado', variant: 'outline', color: '#f59e0b' },
  agendado: { label: 'Agendado', variant: 'warning', color: '#f59e0b' },
  agendado_sdr: { label: 'Agendado SDR', variant: 'warning', color: '#f59e0b' },
  reuniao: { label: 'Reunião', variant: 'default', color: '#3b82f6' },
  negociacao: { label: 'Negociação', variant: 'default', color: '#3b82f6' },
  ganho: { label: 'Ganho', variant: 'success', color: '#22c55e' },
};

interface MetaDiaria {
  vendedor_id: string;
  vendedor_nome: string;
  meta: number;
  valor_acumulado: number;
  updated_at: string;
}

export default function ControlePage() {
  const router = useRouter();
  const params = useParams();
  const vendedorSlug = params?.vendedor as string;
  
  // Lista de vendedores disponíveis (obtida do mapeamento VENDEDOR_IDS)
  const vendedores = useMemo(() => {
    return Object.keys(VENDEDOR_IDS);
  }, []);

  // Converter slug para nome do vendedor usando mapeamento correto
  const vendedorAtual = useMemo(() => {
    if (!vendedorSlug) {
      const primeiroVendedor = vendedores[0] || '';
      console.log('⚠️ [CONTROLE] Nenhum slug fornecido, usando primeiro vendedor:', primeiroVendedor);
      return primeiroVendedor;
    }
    
    // Decodificar o slug da URL (pode vir com encoding como %c3%a3)
    let decodedSlug = vendedorSlug;
    try {
      decodedSlug = decodeURIComponent(vendedorSlug);
      console.log('🔄 [CONTROLE] Slug decodificado:', { original: vendedorSlug, decoded: decodedSlug });
    } catch (error) {
      console.warn('⚠️ [CONTROLE] Erro ao decodificar slug, usando original:', vendedorSlug);
      decodedSlug = vendedorSlug;
    }
    
    console.log('🔄 [CONTROLE] Convertendo slug para nome:', { slug: decodedSlug });
    
    // Usar função de mapeamento para garantir correspondência correta
    const nomeCompleto = slugToVendedorName(decodedSlug);
    
    console.log('🔄 [CONTROLE] Nome completo obtido:', nomeCompleto);
    console.log('🔄 [CONTROLE] Nome existe em VENDEDOR_IDS?', nomeCompleto ? !!VENDEDOR_IDS[nomeCompleto] : false);
    
    if (nomeCompleto && VENDEDOR_IDS[nomeCompleto]) {
      console.log('✅ [CONTROLE] Slug convertido com sucesso:', { slug: decodedSlug, nome: nomeCompleto, ownerId: VENDEDOR_IDS[nomeCompleto] });
      return nomeCompleto;
    }
    
    // Fallback: capitalizar o slug
    const fallback = decodedSlug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    console.warn('⚠️ [CONTROLE] Slug não encontrado no mapeamento:', { 
      slug: decodedSlug, 
      nomeCompletoObtido: nomeCompleto,
      fallback,
      vendedoresDisponiveis: Object.keys(VENDEDOR_IDS)
    });
    
    // Tentar encontrar correspondência aproximada nos vendedores disponíveis
    const vendedorEncontrado = vendedores.find(v => {
      const vNormalizado = v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const fallbackNormalizado = fallback.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return vNormalizado.includes(fallbackNormalizado) || 
             fallbackNormalizado.includes(vNormalizado.split(' ')[0]);
    });
    
    if (vendedorEncontrado) {
      console.log('✅ [CONTROLE] Vendedor encontrado por correspondência aproximada:', vendedorEncontrado);
      return vendedorEncontrado;
    }
    
    return fallback;
  }, [vendedorSlug, vendedores]);

  // Chave para localStorage específica do vendedor
  const STORAGE_KEY_NOW_ID = `controle_now_id_${vendedorAtual}`;
  
  // Inicializar estados sem acessar localStorage para evitar erro de hidratação
  const [negociacaoNowId, setNegociacaoNowId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Chave para localStorage das negociações do vendedor
  const STORAGE_KEY_DEALS = `controle_deals_${vendedorAtual}`;
  
  // Inicializar sem acessar localStorage para evitar erro de hidratação
  const [negociacoesDoVendedor, setNegociacoesDoVendedor] = useState<Negociacao[]>([]);
  
  // Estado para armazenar meta do vendedor
  const [metaVendedor, setMetaVendedor] = useState<MetaDiaria | null>(null);
  
  // Sempre mostrar loading inicial para evitar erro de hidratação
  const [loading, setLoading] = useState<boolean>(true);
  
  // Carregar do localStorage apenas no cliente (após hidratação)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Carregar ID "now"
        const storedNowId = localStorage.getItem(STORAGE_KEY_NOW_ID);
        if (storedNowId) {
          console.log('📂 [CONTROLE] ID "now" carregado do localStorage:', storedNowId);
          setNegociacaoNowId(storedNowId);
        } else {
          console.log('📂 [CONTROLE] Nenhum ID "now" encontrado no localStorage');
        }
        
        // Carregar negociações
        const storedDeals = localStorage.getItem(STORAGE_KEY_DEALS);
        if (storedDeals) {
          const parsed = JSON.parse(storedDeals);
          console.log('📂 [CONTROLE] Negociações carregadas do localStorage:', parsed.length);
          setNegociacoesDoVendedor(parsed);
          setLoading(false);
        } else {
          console.log('📂 [CONTROLE] Nenhuma negociação encontrada no localStorage');
        }
      } catch (error) {
        console.error('❌ [CONTROLE] Erro ao carregar do localStorage:', error);
      }
    }
  }, [STORAGE_KEY_NOW_ID, STORAGE_KEY_DEALS]); // Executa quando as chaves mudarem (mudança de vendedor)
  
  // Salvar negociações no localStorage sempre que mudarem (apenas no cliente)
  // Salvar mesmo quando vazio para limpar dados antigos se necessário
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_DEALS, JSON.stringify(negociacoesDoVendedor));
        console.log('💾 [CONTROLE] Negociações salvas no localStorage:', negociacoesDoVendedor.length);
      } catch (error) {
        console.error('❌ [CONTROLE] Erro ao salvar negociações no localStorage:', error);
      }
    }
  }, [negociacoesDoVendedor, STORAGE_KEY_DEALS]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);
  const [hasMorePages, setHasMorePages] = useState<boolean>(false);
  
  // Ref para rastrear o vendedor anterior e evitar resets desnecessários
  const prevVendedorRef = useRef<string>(vendedorAtual);
  // Ref para evitar chamadas duplicadas (React Strict Mode)
  const fetchingRef = useRef<boolean>(false);
  // Ref para armazenar a última chamada feita
  const lastFetchRef = useRef<string>('');
  
  // Salvar negociacaoNowId no localStorage sempre que mudar (apenas no cliente)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (negociacaoNowId) {
        try {
          localStorage.setItem(STORAGE_KEY_NOW_ID, negociacaoNowId);
          console.log('💾 [CONTROLE] ID "now" salvo no localStorage:', negociacaoNowId);
        } catch (error) {
          console.error('❌ [CONTROLE] Erro ao salvar ID "now" no localStorage:', error);
        }
      } else {
        try {
          localStorage.removeItem(STORAGE_KEY_NOW_ID);
          console.log('🗑️ [CONTROLE] ID "now" removido do localStorage');
        } catch (error) {
          console.error('❌ [CONTROLE] Erro ao remover ID "now" do localStorage:', error);
        }
      }
    }
  }, [negociacaoNowId, STORAGE_KEY_NOW_ID]);

  // Ref para armazenar o último estado recebido do servidor
  const lastServerStateRef = useRef<Array<[string, string]>>([]);

  // Função auxiliar para atualizar estado baseado no vendedor atual
  const updateStateForCurrentVendedor = useCallback((state: Array<[string, string]>) => {
    // Converter array de arrays para Map para fácil acesso
    const vendedorNowMap = new Map<string, string>(state);
    
    // Obter o owner_id do vendedor atual
    const ownerId = getVendedorId(vendedorAtual);
    
    if (ownerId && vendedorNowMap.has(ownerId)) {
      const dealId = vendedorNowMap.get(ownerId)!;
      console.log(`✅ [CONTROLE] Deal "now" encontrado para vendedor ${vendedorAtual}: ${dealId}`);
      
      // Atualizar o estado local
      setNegociacaoNowId(dealId);
      
      // Atualizar também o isNow nas negociações do vendedor (incluindo todas as páginas carregadas)
      setNegociacoesDoVendedor((prev) => {
        return prev.map((neg) => ({
          ...neg,
          isNow: neg.id === dealId,
        }));
      });
    } else {
      console.log(`ℹ️ [CONTROLE] Nenhum deal "now" encontrado para vendedor ${vendedorAtual}`);
      setNegociacaoNowId(null);
      
      // Limpar isNow de todas as negociações (incluindo todas as páginas carregadas)
      setNegociacoesDoVendedor((prev) => {
        return prev.map((neg) => ({
          ...neg,
          isNow: false,
        }));
      });
    }
  }, [vendedorAtual]);

  // Handler para receber estado de vendedores do servidor (quando conecta ou reconecta)
  const handleControleStateUpdated = useCallback((state: Array<[string, string]>) => {
    console.log('📡 [CONTROLE] Estado de vendedores recebido do servidor:', state.length, 'vendedores');
    
    // Armazenar estado recebido
    lastServerStateRef.current = state;
    
    // Atualizar estado para o vendedor atual
    updateStateForCurrentVendedor(state);
  }, [updateStateForCurrentVendedor]);

  // Quando o vendedor mudar, atualizar estado usando o último estado recebido do servidor
  useEffect(() => {
    if (lastServerStateRef.current.length > 0) {
      console.log(`🔄 [CONTROLE] Vendedor mudou para ${vendedorAtual}, atualizando estado...`);
      updateStateForCurrentVendedor(lastServerStateRef.current);
    }
  }, [vendedorAtual, updateStateForCurrentVendedor]);

  // Obter ownerId do vendedor atual
  const ownerId = useMemo(() => getVendedorId(vendedorSlug) || '', [vendedorSlug]);

  // Handler para receber estado de metas do servidor
  const handleMetasUpdated = useCallback((state: Array<[string, MetaDiaria]>) => {
    console.log('📡 [CONTROLE] Estado de metas recebido do servidor:', state.length, 'metas');
    
    // Encontrar meta do vendedor atual
    const currentOwnerId = getVendedorId(vendedorSlug) || '';
    const meta = state.find(([vendedorId]) => vendedorId === currentOwnerId);
    if (meta) {
      setMetaVendedor(meta[1]);
    } else {
      setMetaVendedor(null);
    }
  }, [vendedorSlug]);

  // WebSocket para enviar atualizações
  const { isConnected: wsConnected, sendDealUpdate, sendMetaUpdate } = useWebSocket({
    room: 'controle',
    onControleStateUpdated: handleControleStateUpdated, // Recebe estado de vendedores ao conectar
    onMetasUpdated: handleMetasUpdated, // Recebe estado de metas
    onConnected: () => {
      console.log('✅ [CONTROLE] WebSocket conectado');
    },
    onError: (err) => {
      console.error('❌ [CONTROLE] Erro WebSocket:', err);
    },
  });

  // Handler para salvar meta
  const handleSaveMeta = useCallback((vendedorId: string, vendedorNome: string, meta: number) => {
    if (sendMetaUpdate) {
      sendMetaUpdate({ vendedor_id: vendedorId, vendedor_nome: vendedorNome, meta });
    }
  }, [sendMetaUpdate]);

  // Calcular valor acumulado baseado na negociação atual marcada como "now"
  const valorAcumulado = useMemo(() => {
    if (!negociacaoNowId) return 0;
    const negociacaoAtual = negociacoesDoVendedor.find(neg => neg.id === negociacaoNowId);
    return negociacaoAtual?.valor || 0;
  }, [negociacaoNowId, negociacoesDoVendedor]);

  // Mapear status do RD Station para status interno
  const mapRdStatusToInternal = (rdStatus: string): Negociacao['status'] => {
    const statusMap: Record<string, Negociacao['status']> = {
      'won': 'ganho',
      'lost': 'negociacao', // Status 'lost' mapeado para 'negociacao'
      'open': 'negociacao',
      'ongoing': 'negociacao', // Status 'ongoing' também mapeado para 'negociacao'
      // Adicione mais mapeamentos conforme necessário
    };
    return statusMap[rdStatus] || 'negociacao';
  };

  // Resetar página quando o vendedor mudar
  useEffect(() => {
    if (prevVendedorRef.current !== vendedorAtual) {
      console.log('🚀 [FRONT] Vendedor mudou, resetando página para 1');
      prevVendedorRef.current = vendedorAtual;
      setCurrentPage(1);
    }
  }, [vendedorAtual]);

  // Chamada à API para buscar deals do vendedor selecionado
  useEffect(() => {
    // Criar uma chave única para esta requisição
    const requestKey = `${vendedorAtual}-${currentPage}-${pageSize}`;
    
    // Evitar chamadas duplicadas
    if (fetchingRef.current || lastFetchRef.current === requestKey) {
      console.log('🚀 [FRONT] Chamada duplicada evitada:', requestKey);
      return;
    }
    
    console.log('🚀 [FRONT] useEffect disparado - dependências:', { vendedorAtual, currentPage, pageSize });
    
    fetchingRef.current = true;
    lastFetchRef.current = requestKey;
    
    const fetchDeals = async () => {
      console.log('🚀 [FRONT] Iniciando fetchDeals');
      console.log('🚀 [FRONT] Estado atual:', { vendedorAtual, currentPage, pageSize });
      
      setLoading(true);
      setError(null);

      try {
        // Obter o owner_id do vendedor atual
        const ownerId = getVendedorId(vendedorAtual);
        console.log('🚀 [FRONT] Owner ID obtido:', ownerId);
        
        // Construir URL com filtro e paginação
        const params = new URLSearchParams();
        if (ownerId) {
          params.append('owner_id', ownerId);
        }
        params.append('page', currentPage.toString());
        params.append('size', pageSize.toString());
        
        const url = `/api/deals?${params.toString()}`;
        const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;
        
        console.log('🚀 [FRONT] ============================================');
        console.log('🚀 [FRONT] CHAMADA DA ROTA /api/deals');
        console.log('🚀 [FRONT] URL completa:', fullUrl);
        console.log('🚀 [FRONT] URL relativa:', url);
        console.log('🚀 [FRONT] Parâmetros:', {
          owner_id: ownerId || 'não fornecido',
          page: currentPage,
          size: pageSize,
        });
        console.log('🚀 [FRONT] Vendedor atual:', vendedorAtual);
        console.log('🚀 [FRONT] Timestamp:', new Date().toISOString());
        console.log('🚀 [FRONT] ============================================');
        
        console.log('🚀 [FRONT] Fazendo fetch...');
        const fetchStartTime = Date.now();
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const fetchDuration = Date.now() - fetchStartTime;
        console.log('🚀 [FRONT] Fetch concluído em', fetchDuration, 'ms');
        
        console.log('🚀 [FRONT] ============================================');
        console.log('🚀 [FRONT] RESPOSTA DA API');
        console.log('🚀 [FRONT] Status:', response.status, response.statusText);
        console.log('🚀 [FRONT] OK?', response.ok);
        console.log('🚀 [FRONT] Headers:', Object.fromEntries(response.headers.entries()));
        console.log('🚀 [FRONT] URL da resposta:', response.url);
        console.log('🚀 [FRONT] ============================================');
        
        const contentType = response.headers.get('content-type');
        console.log('🚀 [FRONT] Content-Type:', contentType);
        
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('🚀 [FRONT] ❌ ERRO: Resposta não é JSON');
          console.error('🚀 [FRONT] Tipo recebido:', contentType);
          console.error('🚀 [FRONT] Primeiros 500 caracteres:', text.substring(0, 500));
          console.error('🚀 [FRONT] Tamanho total:', text.length);
          setError('Erro ao processar resposta da API');
          setLoading(false);
          return;
        }

        console.log('🚀 [FRONT] Parseando JSON...');
        const data = await response.json();
        
        console.log('🚀 [FRONT] ============================================');
        console.log('🚀 [FRONT] DADOS RECEBIDOS');
        console.log('🚀 [FRONT] Resposta completa:', JSON.stringify(data, null, 2));
        console.log('🚀 [FRONT] Tipo de data:', typeof data);
        console.log('🚀 [FRONT] É array?', Array.isArray(data));
        console.log('🚀 [FRONT] Tem propriedade data?', 'data' in data);
        console.log('🚀 [FRONT] Total de deals:', data.data?.length || 0);
        console.log('🚀 [FRONT] Links:', data.links);
        console.log('🚀 [FRONT] Erros?', data.errors);
        console.log('🚀 [FRONT] ============================================');
        
        if (!response.ok) {
          console.error('🚀 [FRONT] ============================================');
          console.error('🚀 [FRONT] ❌ ERRO NA RESPOSTA');
          console.error('🚀 [FRONT] Status:', response.status);
          console.error('🚀 [FRONT] Status Text:', response.statusText);
          console.error('🚀 [FRONT] Dados do erro:', JSON.stringify(data, null, 2));
          console.error('🚀 [FRONT] Primeiro erro:', data.errors?.[0]);
          console.error('🚀 [FRONT] ============================================');
          setError(data.errors?.[0]?.detail || 'Erro ao buscar negociações');
          setLoading(false);
          return;
        }

        // Mapear deals da API para o formato interno
        if (data.data && Array.isArray(data.data)) {
          // Obter o estado atual do WebSocket para aplicar isNow corretamente
          // Isso garante que mesmo após paginação, o estado "now" seja mantido
          const currentNowId = negociacaoNowId;
          
          const negociacoesMapeadas = data.data.map((deal: any) => ({
            id: deal.id,
            cliente: deal.name,
            status: mapRdStatusToInternal(deal.status),
            // Priorizar o estado do WebSocket sobre o campo da API
            // Quando há paginação, o estado do WebSocket sempre prevalece
            isNow: currentNowId === deal.id,
            tarefa: deal.custom_fields?.tarefa || '',
            valor: deal.total_price || 0,
          }));
          
          setNegociacoesDoVendedor(negociacoesMapeadas);
          
          // Verificar se há mais páginas disponíveis
          setHasMorePages(!!data.links?.next);
        } else {
          setNegociacoesDoVendedor([]);
          setHasMorePages(false);
        }
        
        console.log('🚀 [FRONT] Processamento concluído com sucesso');
        setLoading(false);
        fetchingRef.current = false;
      } catch (err: any) {
        console.error('🚀 [FRONT] ============================================');
        console.error('🚀 [FRONT] ❌ EXCEÇÃO CAPTURADA');
        console.error('🚀 [FRONT] Tipo do erro:', err?.constructor?.name);
        console.error('🚀 [FRONT] Mensagem:', err?.message);
        console.error('🚀 [FRONT] Stack:', err?.stack);
        console.error('🚀 [FRONT] Erro completo:', err);
        console.error('🚀 [FRONT] Timestamp:', new Date().toISOString());
        console.error('🚀 [FRONT] ============================================');
        setError('Erro ao conectar com a API');
        setLoading(false);
        fetchingRef.current = false;
        
        // Em caso de erro, limpar dados
        setNegociacoesDoVendedor([]);
        setHasMorePages(false);
      }
    };

    fetchDeals();
  }, [vendedorAtual, currentPage, pageSize]);

  // Filtrar negociações pelo termo de pesquisa
  const negociacoesFiltradas = useMemo(() => {
    if (!searchTerm.trim()) {
      return negociacoesDoVendedor;
    }
    const termoLower = searchTerm.toLowerCase().trim();
    return negociacoesDoVendedor.filter((negociacao) =>
      negociacao.cliente.toLowerCase().includes(termoLower)
    );
  }, [negociacoesDoVendedor, searchTerm]);


  // Ref para rastrear IDs das negociações carregadas para detectar quando novos dados são carregados
  const prevNegociacoesIdsRef = useRef<string>('');
  
  // Atualizar negociação "now" quando negociacaoNowId mudar
  // Garantir que o estado do WebSocket seja sempre aplicado aos dados carregados
  useEffect(() => {
    // Aplicar estado apenas se há dados carregados
    if (negociacoesDoVendedor.length === 0) return;
    
    setNegociacoesDoVendedor((prev) => {
      if (negociacaoNowId) {
        // Verificar se já está correto para evitar atualização desnecessária
        const needsUpdate = prev.some((neg) => 
          (neg.id === negociacaoNowId && !neg.isNow) || 
          (neg.id !== negociacaoNowId && neg.isNow)
        );
        
        if (!needsUpdate) return prev;
        
        // Se há um deal "now", aplicar o flag apenas ao deal correto
        return prev.map((neg) => ({
          ...neg,
          isNow: neg.id === negociacaoNowId,
        }));
      } else {
        // Verificar se precisa limpar
        const needsUpdate = prev.some((neg) => neg.isNow);
        
        if (!needsUpdate) return prev;
        
        // Se não há deal "now", limpar todos os flags
        return prev.map((neg) => ({
          ...neg,
          isNow: false,
        }));
      }
    });
  }, [negociacaoNowId]); // Aplicar quando o estado do WebSocket mudar
  
  // Aplicar estado quando novos dados forem carregados (paginação)
  useEffect(() => {
    if (negociacoesDoVendedor.length === 0) return;
    
    // Criar uma chave única baseada nos IDs das negociações para detectar mudanças
    const currentIds = negociacoesDoVendedor.map((neg) => neg.id).join(',');
    const idsChanged = currentIds !== prevNegociacoesIdsRef.current;
    
    // Aplicar estado se os IDs mudaram (nova página carregada)
    if (idsChanged && negociacaoNowId) {
      // Atualizar ref
      prevNegociacoesIdsRef.current = currentIds;
      
      // Aplicar estado "now" aos novos dados carregados
      setNegociacoesDoVendedor((prev) => {
        return prev.map((neg) => ({
          ...neg,
          isNow: neg.id === negociacaoNowId,
        }));
      });
    } else if (idsChanged) {
      // Se não há deal "now", atualizar ref e limpar flags
      prevNegociacoesIdsRef.current = currentIds;
      setNegociacoesDoVendedor((prev) => {
        return prev.map((neg) => ({
          ...neg,
          isNow: false,
        }));
      });
    }
  }, [negociacoesDoVendedor.map((n) => n.id).join(',')]); // Detectar quando novos dados são carregados

  // Função para converter nome do vendedor em slug
  // Remove acentos para garantir compatibilidade com URLs
  const vendedorToSlug = (nome: string) => {
    return nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, ''); // Remove caracteres especiais
  };

  const handleVendedorChange = async (novoVendedor: string) => {
    const slug = vendedorToSlug(novoVendedor);
    setCurrentPage(1); // Resetar página ao trocar vendedor
    router.push(`/controle/${slug}`);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (hasMorePages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSetNow = async (negociacaoId: string) => {
    try {
      console.log('🔄 [FRONT] Definindo negociação como "now"');
      console.log('🔄 [FRONT] Deal ID recebido:', negociacaoId);
      console.log('🔄 [FRONT] Tipo do ID:', typeof negociacaoId);
      
      // Validar que o ID foi fornecido
      if (!negociacaoId || negociacaoId.trim() === '') {
        console.error('❌ [FRONT] ID da negociação não fornecido ou inválido');
        setError('ID da negociação inválido');
        return;
      }
      
      // Obter o owner_id do vendedor atual
      console.log('🔄 [FRONT] Vendedor atual:', vendedorAtual);
      console.log('🔄 [FRONT] Vendedor slug:', vendedorSlug);
      console.log('🔄 [FRONT] Vendedores disponíveis:', vendedores);
      
      const ownerId = getVendedorId(vendedorAtual);
      
      console.log('🔄 [FRONT] Owner ID obtido:', ownerId);
      console.log('🔄 [FRONT] VENDEDOR_IDS keys:', Object.keys(VENDEDOR_IDS));
      
      if (!ownerId) {
        console.error('❌ [FRONT] Não foi possível obter owner_id para:', vendedorAtual);
        console.error('❌ [FRONT] Vendedor atual não encontrado no mapeamento VENDEDOR_IDS');
        console.error('❌ [FRONT] Vendedores disponíveis:', Object.keys(VENDEDOR_IDS));
        // Usar o nome decodificado corretamente na mensagem de erro
        const nomeExibicao = vendedorAtual || vendedorSlug || 'desconhecido';
        setError(`Não foi possível identificar o vendedor "${nomeExibicao}". Verifique se o nome está correto.`);
        return;
      }

      console.log('✅ [FRONT] Owner ID válido:', ownerId);

      // Chamar o endpoint para confirmar (sempre chamar, independente do WebSocket)
      let apiCallSuccess = false;
      try {
        const apiUrl = `/api/deals/${negociacaoId}/set-now`;
        console.log('🔄 [FRONT] Chamando rota de confirmação:', apiUrl);
        console.log('🔄 [FRONT] WebSocket conectado?', wsConnected);
        
        const response = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ owner_id: ownerId }),
        });

        console.log('🔄 [FRONT] Status da resposta:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.errors?.[0]?.detail || 'Erro ao confirmar atualização';
          console.error('❌ [FRONT] Erro ao confirmar:', errorMessage);
          setError(errorMessage);
          return;
        } else {
          const result = await response.json();
          console.log('✅ [FRONT] Confirmação recebida:', result);
          console.log('✅ [FRONT] Deal ID confirmado:', result.deal_id);
          apiCallSuccess = true;
        }
      } catch (error: any) {
        console.error('❌ [FRONT] Erro ao chamar rota de confirmação:', error);
        setError('Erro ao conectar com o servidor. Tente novamente.');
        return;
      }

      // Enviar atualização via WebSocket para a página de painel (após confirmação da rota)
      if (wsConnected && apiCallSuccess) {
        const updateData = {
          deal_id: negociacaoId,
          is_now: true,
          updated_at: new Date().toISOString(),
          owner_id: ownerId,
        };
        console.log('📤 [FRONT] Enviando atualização via WebSocket:', updateData);
        sendDealUpdate(updateData);
        console.log('✅ [FRONT] Atualização enviada via WebSocket');
      } else if (!wsConnected) {
        console.warn('⚠️ [FRONT] WebSocket não conectado, atualização não será enviada em tempo real');
        // Não retornar erro aqui, pois a rota já foi chamada com sucesso
      }
      
      // Atualizar o estado local
      setNegociacaoNowId(negociacaoId);
      
      // Atualizar também o isNow nas negociações do vendedor
      setNegociacoesDoVendedor((prev) => {
        return prev.map((neg) => ({
          ...neg,
          isNow: neg.id === negociacaoId,
        }));
      });
      
      // Limpar erro se houver
      setError(null);
    } catch (error: any) {
      console.error('❌ [FRONT] Erro ao chamar endpoint:', error);
      setError('Erro ao conectar com o servidor. Tente novamente.');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <>
      <BackgroundLogo />
      <div className="relative z-10 min-h-screen flex flex-col w-full max-w-[100vw] overflow-x-hidden" style={{ padding: 'clamp(0.75rem, 1.5vw, 1.5rem)' }}>
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-end mb-3 md:mb-4" style={{ paddingBottom: 'clamp(0.25rem, 0.5vw, 0.5rem)' }}>
          {/* Dropdown do vendedor */}
          <div className="flex items-center w-full md:w-auto justify-end">
            <Select
              value={vendedorAtual}
              onChange={(e) => handleVendedorChange(e.target.value)}
              className="w-full md:w-auto"
              style={{ 
                minWidth: 'clamp(150px, 25vw, 300px)',
                maxWidth: '100%',
                fontSize: 'clamp(0.75rem, 1.5vw, 0.9375rem)',
              }}
            >
              {vendedores.map((vendedor) => (
                <option key={vendedor} value={vendedor}>
                  {vendedor}
                </option>
              ))}
            </Select>
          </div>
        </header>

        {/* Conteúdo principal */}
        <div className="flex-1 w-full">
          <h1 className="text-white font-bold mb-2 md:mb-3" style={{ fontSize: 'clamp(1.125rem, 3.5vw, 2rem)', lineHeight: '1.2' }}>
            Controle de Negociações
          </h1>
          <p className="text-[#CCCCCC] mb-3 md:mb-4" style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>
            Selecione a negociação que está em andamento agora
          </p>

          {/* Barra de pesquisa */}
          <div className="mb-3 md:mb-4">
            <div className="relative w-full max-w-full md:max-w-md">
              <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-[#CCCCCC]" style={{ width: 'clamp(0.875rem, 1.5vw, 1.125rem)', height: 'clamp(0.875rem, 1.5vw, 1.125rem)' }} />
              <input
                type="text"
                placeholder="Pesquisar por nome do cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-[#888888] focus:outline-none focus:border-[#fed094] focus:ring-1 focus:ring-[#fed094] transition-colors"
                style={{
                  padding: 'clamp(0.5rem, 1vw, 0.75rem) clamp(0.5rem, 1vw, 0.75rem) clamp(0.5rem, 1vw, 0.75rem) clamp(2rem, 3.5vw, 2.75rem)',
                  fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)',
                }}
              />
            </div>
          </div>

          {/* Input de Meta Diária - Fixado entre busca e cards */}
          {ownerId && ownerId !== '' && (
            <div className="mb-3 md:mb-4">
              <MetaInput
                vendedorNome={vendedorAtual}
                vendedorId={ownerId}
                metaAtual={metaVendedor?.meta}
                valorAcumulado={valorAcumulado}
                onSave={handleSaveMeta}
                isLoading={!wsConnected}
              />
            </div>
          )}

          {/* Mensagem de erro */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-300" style={{ fontSize: 'clamp(0.875rem, 1.2vw, 1rem)' }}>
                ⚠️ {error}
              </p>
            </div>
          )}

          {/* Lista de negociações */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-[#fed094]" style={{ width: 'clamp(2rem, 3vw, 3rem)', height: 'clamp(2rem, 3vw, 3rem)' }} />
                <p className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)' }}>
                  Carregando negociações...
                </p>
              </div>
            </div>
          ) : (
            <div 
              className="grid gap-2 md:gap-3 lg:gap-4 w-full" 
              style={{ 
                gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(240px, 30vw, 360px), 1fr))',
                // Em telas muito grandes, limita o número máximo de colunas para melhor legibilidade
                maxWidth: '100%',
              }}
            >
              {negociacoesFiltradas.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)' }}>
                    {searchTerm.trim() ? 'Nenhuma negociação encontrada com esse nome.' : 'Nenhuma negociação disponível.'}
                  </p>
                </div>
              ) : (
            <>
              {negociacoesFiltradas.map((negociacao) => {
              const statusInfo = statusConfig[negociacao.status] || { label: negociacao.status, variant: 'default' as const, color: '#6b7280' };
              const isNow = negociacaoNowId === negociacao.id;

              return (
                <Card
                  key={negociacao.id}
                  className={cn(
                    "hover:border-[#fed094]/50 transition-colors cursor-pointer",
                    isNow && "border-2 border-[#fed094] shadow-lg shadow-[#fed094]/30"
                  )}
                  style={isNow ? {
                    borderWidth: '3px',
                    borderColor: '#fed094',
                    boxShadow: '0 10px 25px -5px rgba(254, 208, 148, 0.3), 0 8px 10px -6px rgba(254, 208, 148, 0.2)',
                    backgroundColor: '#1A1A1A',
                  } : {}}
                >
                  <CardHeader style={{ padding: 'clamp(0.625rem, 1vw, 1rem)' }}>
                    <div className="flex items-start justify-between gap-1.5 md:gap-2">
                      <CardTitle className="text-white line-clamp-2 flex-1" style={{ fontSize: 'clamp(0.8125rem, 2vw, 1.125rem)', lineHeight: '1.3' }}>
                        {negociacao.cliente}
                      </CardTitle>
                      <Badge 
                        variant={statusInfo.variant} 
                        className="flex-shrink-0" 
                        style={{ 
                          fontSize: 'clamp(0.5625rem, 1vw, 0.75rem)',
                          padding: 'clamp(0.25rem, 0.5vw, 0.375rem) clamp(0.5rem, 0.8vw, 0.625rem)',
                        }}
                      >
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent style={{ padding: 'clamp(0.625rem, 1vw, 1rem)', paddingTop: 0 }}>
                    <div className="space-y-2 md:space-y-3">
                      {/* Valor */}
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <DollarSign className="text-[#CCCCCC] flex-shrink-0" style={{ width: 'clamp(0.75rem, 1.5vw, 1rem)', height: 'clamp(0.75rem, 1.5vw, 1rem)' }} />
                        <p className="text-white font-semibold break-words" style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 1rem)' }}>
                          {negociacao.valor && negociacao.valor > 0 
                            ? formatCurrency(negociacao.valor)
                            : 'Valor não definido'
                          }
                        </p>
                      </div>

                      {/* Botão para definir como "now" */}
                      <Button
                        onClick={() => handleSetNow(negociacao.id)}
                        className={cn(
                          "w-full",
                          isNow ? "bg-[#fed094] text-[#1A1A1A] hover:bg-[#fed094]/90" : "bg-[#2A2A2A] text-white hover:bg-[#3A3A3A]"
                        )}
                        style={{ 
                          fontSize: 'clamp(0.6875rem, 1.5vw, 0.875rem)', 
                          padding: 'clamp(0.5rem, 1vw, 0.625rem)',
                          minHeight: 'clamp(2rem, 3vw, 2.5rem)',
                        }}
                      >
                        {isNow ? (
                          <>
                            <Check className="mr-1.5 md:mr-2 flex-shrink-0" style={{ width: 'clamp(0.75rem, 1.5vw, 0.875rem)', height: 'clamp(0.75rem, 1.5vw, 0.875rem)' }} />
                            Agora
                          </>
                        ) : (
                          'Definir como Agora'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
              
              {/* Controles de Paginação */}
              {(currentPage > 1 || hasMorePages) && (
                <div className="col-span-full flex flex-wrap items-center justify-center gap-3 md:gap-4 mt-6 md:mt-8">
                  <Button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || loading}
                    className="bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      fontSize: 'clamp(0.8125rem, 1.1vw, 1rem)', 
                      padding: 'clamp(0.5rem, 0.9vw, 0.75rem) clamp(0.875rem, 1.5vw, 1.5rem)',
                      minHeight: 'clamp(2.25rem, 3.5vw, 2.75rem)',
                    }}
                  >
                    <ChevronLeft className="flex-shrink-0" style={{ width: 'clamp(1rem, 1.4vw, 1.25rem)', height: 'clamp(1rem, 1.4vw, 1.25rem)' }} />
                    <span className="hidden sm:inline">Anterior</span>
                  </Button>
                  
                  <span className="text-[#CCCCCC] px-2" style={{ fontSize: 'clamp(0.875rem, 1.2vw, 1.125rem)' }}>
                    Página {currentPage}
                  </span>
                  
                  <Button
                    onClick={handleNextPage}
                    disabled={!hasMorePages || loading}
                    className="bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      fontSize: 'clamp(0.8125rem, 1.1vw, 1rem)', 
                      padding: 'clamp(0.5rem, 0.9vw, 0.75rem) clamp(0.875rem, 1.5vw, 1.5rem)',
                      minHeight: 'clamp(2.25rem, 3.5vw, 2.75rem)',
                    }}
                  >
                    <span className="hidden sm:inline">Próxima</span>
                    <ChevronRight className="flex-shrink-0" style={{ width: 'clamp(1rem, 1.4vw, 1.25rem)', height: 'clamp(1rem, 1.4vw, 1.25rem)' }} />
                  </Button>
                </div>
              )}
            </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
