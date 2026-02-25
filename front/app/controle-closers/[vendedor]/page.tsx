'use client';

import React from 'react';
import { BackgroundLogo } from '@/components/ui/background-logo';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetaInput } from '@/components/controle/meta-input';
import { ForecastForm } from '@/components/controle/forecast-form';
import { ReuniaoForm } from '@/components/controle/reuniao-form';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Negociacao } from '@/lib/types/negociacoes';
import { ForecastFormData, Forecast } from '@/lib/types/forecast';
import { ReuniaoFormData } from '@/lib/types/reuniao';
import { DollarSign, Check, Search, Loader2, ChevronLeft, ChevronRight, Calendar, Edit, Trash2, List, Grid, CheckCircle2, RotateCcw, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVendedorId, VENDEDOR_IDS, slugToVendedorName, getVendedorTipo } from '@/lib/utils/vendedores';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

interface MetaDiaria {
  vendedor_id: string;
  vendedor_nome: string;
  meta: number;
  valor_acumulado: number;
  qtd_reunioes: number;
  updated_at: string;
}

export default function ControleClosersPage() {
  const router = useRouter();
  const params = useParams();
  const vendedorSlug = params?.vendedor as string;
  
  // Lista de vendedores disponíveis - apenas closers
  const vendedores = useMemo(() => {
    return Object.keys(VENDEDOR_IDS).filter(v => getVendedorTipo(v) === 'closer');
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
    
    if (nomeCompleto && VENDEDOR_IDS[nomeCompleto] && getVendedorTipo(nomeCompleto) === 'closer') {
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
      vendedoresDisponiveis: vendedores
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

  // Redirecionar se o vendedor não for closer
  useEffect(() => {
    if (vendedorAtual && getVendedorTipo(vendedorAtual) !== 'closer') {
      router.replace('/controle-closers');
    }
  }, [vendedorAtual, router]);

  // Chave para localStorage específica do vendedor
  const STORAGE_KEY_NOW_ID = `controle_now_id_${vendedorAtual}`;
  
  // Inicializar estados sem acessar localStorage para evitar erro de hidratação
  const [negociacaoNowId, setNegociacaoNowId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Chave para localStorage das negociações do vendedor
  const STORAGE_KEY_DEALS = `controle_deals_${vendedorAtual}`;
  
  // Chave para localStorage dos forecasts do vendedor
  const STORAGE_KEY_FORECASTS = `controle_forecasts_${vendedorAtual}`;
  
  // Inicializar sem acessar localStorage para evitar erro de hidratação
  const [negociacoesDoVendedor, setNegociacoesDoVendedor] = useState<Negociacao[]>([]);
  
  // Estado para armazenar meta do vendedor
  const [metaVendedor, setMetaVendedor] = useState<MetaDiaria | null>(null);
  
  // Estado para forecast selecionado (negociação que será usada para criar forecast)
  const [negociacaoSelecionadaParaForecast, setNegociacaoSelecionadaParaForecast] = useState<Negociacao | null>(null);
  
  // Estado para forecasts existentes do vendedor
  const [forecastsDoVendedor, setForecastsDoVendedor] = useState<Forecast[]>([]);
  
  // Estado para forecast sendo editado
  const [forecastSendoEditado, setForecastSendoEditado] = useState<Forecast | null>(null);
  
  // Estado para controlar criação manual de forecast (sem negociação)
  const [criandoForecastManual, setCriandoForecastManual] = useState<boolean>(false);
  
  // Estado para controlar criação manual de call (reunião)
  const [criandoCallManual, setCriandoCallManual] = useState<boolean>(false);
  const [savingReuniao, setSavingReuniao] = useState<boolean>(false);
  
  // Estado para visualização (lista ou cards)
  const [visualizacao, setVisualizacao] = useState<'lista' | 'cards'>('cards');
  
  // Estado para armazenar a negociação "now" completa (independente da paginação)
  const [negociacaoNowCompleta, setNegociacaoNowCompleta] = useState<Negociacao | null>(null);
  
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
        } else {
          console.log('📂 [CONTROLE] Nenhuma negociação encontrada no localStorage');
        }
        
        // Carregar forecasts: buscar do banco (dia atual) e usar como base
        const hoje = new Date().toISOString().split('T')[0];
        fetch(`/api/forecasts?closerNome=${encodeURIComponent(vendedorAtual)}&dataCriacao=${hoje}`)
          .then((res) => res.json())
          .then((result) => {
            if (result.success && Array.isArray(result.data) && result.data.length > 0) {
              const fromApi = result.data.map((f: Record<string, unknown>) => ({
                id: f.id,
                vendedorId: f.vendedorId,
                closerNome: f.closerNome || f.vendedorNome || '',
                clienteNome: f.clienteNome,
                clienteNumero: f.clienteNumero,
                data: f.data,
                horario: f.horario,
                valor: f.valor,
                observacoes: f.observacoes || '',
                primeiraCall: f.primeiraCall,
                negociacaoId: f.negociacaoId,
                createdAt: f.createdAt,
                updatedAt: f.updatedAt,
              }));
              console.log('📂 [CONTROLE] Forecasts carregados do banco:', fromApi.length);
              setForecastsDoVendedor(fromApi);
              localStorage.setItem(STORAGE_KEY_FORECASTS, JSON.stringify(fromApi));
            } else {
              const storedForecasts = localStorage.getItem(STORAGE_KEY_FORECASTS);
              if (storedForecasts) {
                const parsed = JSON.parse(storedForecasts);
                console.log('📂 [CONTROLE] Forecasts carregados do localStorage:', parsed.length);
                setForecastsDoVendedor(parsed);
              } else {
                setForecastsDoVendedor([]);
              }
            }
          })
          .catch(() => {
            const storedForecasts = localStorage.getItem(STORAGE_KEY_FORECASTS);
            if (storedForecasts) {
              const parsed = JSON.parse(storedForecasts);
              setForecastsDoVendedor(parsed);
            } else {
              setForecastsDoVendedor([]);
            }
          });
        
        // Carregar preferência de visualização
        const storedVisualizacao = localStorage.getItem(`controle_visualizacao_${vendedorAtual}`);
        if (storedVisualizacao === 'lista' || storedVisualizacao === 'cards') {
          setVisualizacao(storedVisualizacao);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('❌ [CONTROLE] Erro ao carregar do localStorage:', error);
      }
    }
  }, [STORAGE_KEY_NOW_ID, STORAGE_KEY_DEALS, STORAGE_KEY_FORECASTS]); // Executa quando as chaves mudarem (mudança de vendedor)
  
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
  
  // Estado para armazenar todas as negociações quando há busca (para buscar em todas as páginas)
  const [todasNegociacoes, setTodasNegociacoes] = useState<Negociacao[]>([]);
  const [buscandoTodasPaginas, setBuscandoTodasPaginas] = useState<boolean>(false);
  
  // Estado para rastrear se uma busca está em andamento
  const [buscandoNegociacoes, setBuscandoNegociacoes] = useState<boolean>(false);
  
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

  // Obter ownerId do vendedor atual (usar vendedorAtual que é o nome completo, não o slug)
  const ownerId = useMemo(() => getVendedorId(vendedorAtual) || '', [vendedorAtual]);

  // Handler para receber estado de metas do servidor
  const handleMetasUpdated = useCallback((state: Array<[string, MetaDiaria]>) => {
    console.log('📡 [CONTROLE] Estado de metas recebido do servidor:', state.length, 'metas');
    
    // Encontrar meta do vendedor atual (usar vendedorAtual que é o nome completo)
    const currentOwnerId = getVendedorId(vendedorAtual) || '';
    const meta = state.find(([vendedorId]) => vendedorId === currentOwnerId);
    if (meta) {
      setMetaVendedor(meta[1]);
    } else {
      setMetaVendedor(null);
    }
  }, [vendedorAtual]);

  // WebSocket para enviar atualizações
  const { isConnected: wsConnected, sendDealUpdate, sendMetaUpdate, sendForecastUpdate, sendForecastDelete } = useWebSocket({
    room: 'controle',
    onControleStateUpdated: handleControleStateUpdated, // Recebe estado de vendedores ao conectar
    onMetasUpdated: handleMetasUpdated, // Recebe estado de metas
    onForecastsUpdated: (state: Array<[string, any]>) => {
      // Atualizar forecasts em tempo real quando receber do WebSocket (sincronizado com banco)
      const forecastsMap = new Map<string, any[]>();
      state.forEach(([vendedorId, forecasts]) => {
        forecastsMap.set(vendedorId, forecasts);
      });
      const forecastsDoVendedor = forecastsMap.get(ownerId || '') || [];
      setForecastsDoVendedor(forecastsDoVendedor);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_FORECASTS, JSON.stringify(forecastsDoVendedor));
      }
    },
    onConnected: () => {
      console.log('✅ [CONTROLE] WebSocket conectado');
    },
    onError: (err) => {
      console.error('❌ [CONTROLE] Erro WebSocket:', err);
    },
  });

  // Handler para salvar meta
  const handleSaveMeta = useCallback((vendedorId: string, vendedorNome: string, meta: number) => {
    // Quando uma nova meta é definida, sempre resetar o valor acumulado para 0
    // O valor acumulado só deve ser atualizado quando o usuário marca como "Vendido"
    setValorAcumulado(0);
    const storedKey = `valor_acumulado_${vendedorAtual}`;
    localStorage.setItem(storedKey, '0');
    
    if (sendMetaUpdate) {
      sendMetaUpdate({ 
        vendedor_id: vendedorId, 
        vendedor_nome: vendedorNome, 
        meta,
        valor_acumulado: 0  // Sempre resetar para 0 quando uma nova meta é definida
      });
    }
  }, [sendMetaUpdate, vendedorAtual]);

  // Handler para salvar forecast (criar ou atualizar)
  const handleSaveForecast = useCallback((forecastData: ForecastFormData) => {
    if (!vendedorAtual) return;
    
    // Garantir que temos o ownerId (tentar obter novamente se não estiver disponível)
    const currentOwnerId = ownerId || getVendedorId(vendedorAtual) || '';
    if (!currentOwnerId) {
      console.error('❌ [CONTROLE] Não foi possível obter ownerId para salvar forecast');
      return;
    }
    
    // Se está editando um forecast existente
    if (forecastSendoEditado) {
      const forecastAtualizado: Forecast = {
        ...forecastSendoEditado,
        clienteNome: forecastData.clienteNome,
        clienteNumero: forecastData.clienteNumero,
        data: forecastData.data,
        horario: forecastData.horario,
        valor: forecastData.valor,
        observacoes: forecastData.observacoes,
        primeiraCall: forecastData.primeiraCall,
        updatedAt: new Date().toISOString(),
      };
      
      console.log('💾 [CONTROLE] Atualizando forecast:', forecastAtualizado);
      
      // Enviar via WebSocket
      if (sendForecastUpdate) {
        sendForecastUpdate(forecastAtualizado);
      }
      
      // Atualizar no banco via API PUT
      fetch(`/api/forecasts/${encodeURIComponent(forecastSendoEditado.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forecastAtualizado),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log('✅ [CONTROLE] Forecast atualizado no banco:', forecastSendoEditado.id);
          } else {
            console.warn('⚠️ [CONTROLE] Erro ao atualizar forecast no banco:', data.message);
          }
        })
        .catch((err) => {
          console.error('❌ [CONTROLE] Erro ao chamar API de update forecast:', err);
        });
      
      // Atualizar no localStorage
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(STORAGE_KEY_FORECASTS);
          const forecasts: Forecast[] = stored ? JSON.parse(stored) : [];
          const index = forecasts.findIndex(f => f.id === forecastSendoEditado.id);
          if (index >= 0) {
            forecasts[index] = forecastAtualizado;
            localStorage.setItem(STORAGE_KEY_FORECASTS, JSON.stringify(forecasts));
            setForecastsDoVendedor(forecasts);
          }
        } catch (error) {
          console.error('❌ [CONTROLE] Erro ao atualizar forecast no localStorage:', error);
        }
      }
      
      // Fechar o formulário
      setForecastSendoEditado(null);
      return;
    }
    
    // Criar novo forecast (pode ser manual, sem negociação)
    const now = new Date();
    const dataCriacao = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaCriacao = now.toTimeString().slice(0, 8); // HH:mm:ss

    const forecast: Forecast = {
      id: `forecast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      vendedorId: currentOwnerId,
      closerNome: vendedorAtual,
      clienteNome: forecastData.clienteNome,
      clienteNumero: forecastData.clienteNumero,
      data: forecastData.data,
      horario: forecastData.horario,
      valor: forecastData.valor,
      observacoes: forecastData.observacoes,
      primeiraCall: forecastData.primeiraCall,
      negociacaoId: negociacaoSelecionadaParaForecast?.id, // Opcional - pode ser undefined para forecast manual
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const payloadParaBanco = {
      ...forecast,
      dataCriacao,
      horaCriacao,
      closerNome: vendedorAtual, // já incluído no forecast
    };

    console.log('💾 [CONTROLE] Criando novo forecast:', forecast);

    // Enviar via WebSocket
    if (sendForecastUpdate) {
      sendForecastUpdate(forecast);
    }

    // Salvar no banco via API POST
    fetch('/api/forecasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadParaBanco),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          console.log('✅ [CONTROLE] Forecast salvo no banco:', data.data);
        } else {
          console.warn('⚠️ [CONTROLE] Erro ao salvar forecast no banco:', data.message);
        }
      })
      .catch((err) => {
        console.error('❌ [CONTROLE] Erro ao chamar API de forecasts:', err);
      });

    // Salvar localmente no localStorage também
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_FORECASTS);
        const forecasts: Forecast[] = stored ? JSON.parse(stored) : [];
        forecasts.push(forecast);
        localStorage.setItem(STORAGE_KEY_FORECASTS, JSON.stringify(forecasts));
        setForecastsDoVendedor(forecasts);
      } catch (error) {
        console.error('❌ [CONTROLE] Erro ao salvar forecast no localStorage:', error);
      }
    }
    
    // Fechar o formulário
    setNegociacaoSelecionadaParaForecast(null);
    setCriandoForecastManual(false);
  }, [negociacaoSelecionadaParaForecast, forecastSendoEditado, ownerId, vendedorAtual, sendForecastUpdate, STORAGE_KEY_FORECASTS]);

  // Handler para selecionar negociação para forecast (com scroll para o topo)
  const handleSelecionarForecast = useCallback((negociacao: Negociacao) => {
    setNegociacaoSelecionadaParaForecast(negociacao);
    setCriandoForecastManual(false);
    setCriandoCallManual(false);
    setForecastSendoEditado(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handler para cancelar forecast
  const handleCancelForecast = useCallback(() => {
    setNegociacaoSelecionadaParaForecast(null);
    setForecastSendoEditado(null);
    setCriandoForecastManual(false);
  }, []);
  
  // Handler para iniciar criação manual de forecast
  const handleCriarForecastManual = useCallback(() => {
    setCriandoForecastManual(true);
    setNegociacaoSelecionadaParaForecast(null);
    setForecastSendoEditado(null);
    setCriandoCallManual(false);
    // Fazer scroll suave para o topo da página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handler para iniciar criação manual de call
  const handleCriarCallManual = useCallback(() => {
    setCriandoCallManual(true);
    setCriandoForecastManual(false);
    setNegociacaoSelecionadaParaForecast(null);
    setForecastSendoEditado(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handler para salvar call (reunião) manual
  const handleSaveReuniao = useCallback(async (data: ReuniaoFormData) => {
    if (!vendedorAtual || !ownerId) return;

    setSavingReuniao(true);
    setError(null);

    try {
      const response = await fetch('/api/reunioes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendedorId: ownerId,
          vendedorNome: vendedorAtual,
          data: data.data,
          clienteNome: data.clienteNome.trim(),
          clienteNumero: data.clienteNumero?.trim() || undefined,
          valor: data.valor && data.valor > 0 ? data.valor : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ [CONTROLE] Call registrada com sucesso:', result.data);
        setCriandoCallManual(false);
      } else {
        setError(result.message || 'Erro ao registrar call');
      }
    } catch (err) {
      console.error('❌ [CONTROLE] Erro ao registrar call:', err);
      setError('Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setSavingReuniao(false);
    }
  }, [vendedorAtual, ownerId]);

  // Handler para cancelar criação de call
  const handleCancelReuniao = useCallback(() => {
    setCriandoCallManual(false);
  }, []);
  
  // Handler para editar forecast (com scroll para o topo)
  const handleEditForecast = useCallback((forecast: Forecast) => {
    setForecastSendoEditado(forecast);
    setNegociacaoSelecionadaParaForecast(null);
    setCriandoForecastManual(false); // Limpar estado de criação manual
    // Fazer scroll suave para o topo da página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  // Estado para diálogo de confirmação de delete forecast
  const [deleteForecastId, setDeleteForecastId] = useState<string | null>(null);
  // Estado para diálogo de confirmação de reverter venda
  const [showReverterConfirm, setShowReverterConfirm] = useState(false);
  
  // Estado para edição de número do contato
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingPhoneNumber, setEditingPhoneNumber] = useState<string>('');
  const [updatingPhone, setUpdatingPhone] = useState(false);

  // Executar delete de forecast (chamado após confirmação)
  const executeDeleteForecast = useCallback((forecastId: string) => {
    const currentOwnerId = ownerId || getVendedorId(vendedorAtual) || '';

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_FORECASTS);
        const forecasts: Forecast[] = stored ? JSON.parse(stored) : [];
        const filtered = forecasts.filter(f => f.id !== forecastId);
        localStorage.setItem(STORAGE_KEY_FORECASTS, JSON.stringify(filtered));
        setForecastsDoVendedor(filtered);
      } catch (error) {
        console.error('❌ [CONTROLE] Erro ao remover forecast do localStorage:', error);
      }
    }

    fetch(`/api/forecasts/${encodeURIComponent(forecastId)}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) console.log('✅ [CONTROLE] Forecast removido do banco:', forecastId);
        else console.warn('⚠️ [CONTROLE] Erro ao remover forecast do banco:', data.message);
      })
      .catch((err) => console.error('❌ [CONTROLE] Erro ao chamar API de delete forecast:', err));

    if (sendForecastDelete && currentOwnerId) sendForecastDelete(forecastId, currentOwnerId);
  }, [STORAGE_KEY_FORECASTS, ownerId, vendedorAtual, sendForecastDelete]);

  // Handler para abrir confirmação e executar delete de forecast
  const handleDeleteForecast = useCallback((forecastId: string) => {
    setDeleteForecastId(forecastId);
  }, []);

  // Estado para valor acumulado (agora será atualizado manualmente via botão "Vendido")
  const [valorAcumulado, setValorAcumulado] = useState<number>(0);
  
  // Estado para rastrear se a negociação atual foi marcada como vendida
  const [negociacaoVendida, setNegociacaoVendida] = useState<boolean>(false);
  
  // Carregar valor acumulado do localStorage ou da meta quando disponível
  useEffect(() => {
    if (metaVendedor) {
      const storedKey = `valor_acumulado_${vendedorAtual}`;
      const stored = localStorage.getItem(storedKey);
      
      // Priorizar valor do localStorage (que é atualizado quando marca como vendido)
      // Se não há no localStorage, usar o valor da meta do servidor
      if (stored !== null) {
        const valorStored = parseFloat(stored);
        setValorAcumulado(valorStored);
      } else {
        // Se não há no localStorage, usar o valor da meta do servidor
        const valorDaMeta = metaVendedor.valor_acumulado || 0;
        setValorAcumulado(valorDaMeta);
        // Salvar no localStorage para manter sincronizado
        localStorage.setItem(storedKey, valorDaMeta.toString());
      }
    }
  }, [metaVendedor, vendedorAtual]);

  // Buscar negociação "now" completa quando negociacaoNowId mudar (independente da paginação)
  useEffect(() => {
    if (!negociacaoNowId) {
      setNegociacaoNowCompleta(null);
      setNegociacaoVendida(false);
      return;
    }
    
    // Verificar se já foi vendida
    const storedKey = `negociacao_vendida_${negociacaoNowId}`;
    const stored = localStorage.getItem(storedKey);
    setNegociacaoVendida(stored === 'true');
    
    // Verificar se já está na lista carregada
    const negociacaoNaLista = negociacoesDoVendedor.find(neg => neg.id === negociacaoNowId);
    if (negociacaoNaLista) {
      setNegociacaoNowCompleta(negociacaoNaLista);
      return;
    }
    
    // Se não está na lista, buscar diretamente da API
    const fetchNegociacaoNow = async () => {
      try {
        const response = await fetch(`/api/deals/${negociacaoNowId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.error('❌ [CONTROLE] Erro ao buscar negociação "now"');
          setNegociacaoNowCompleta(null);
          return;
        }
        
        const result = await response.json();
        const deal = result.data;
        
        if (!deal) {
          console.error('❌ [CONTROLE] Negociação "now" não encontrada');
          setNegociacaoNowCompleta(null);
          return;
        }
        
        // Mapear deal para formato interno
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
          contact_id: deal.contact_ids?.[0] || deal.contacts?.[0]?.id || undefined, // ID do primeiro contato associado
          status: mapRdStatusToInternal(deal.status),
          isNow: true,
          tarefa: deal.custom_fields?.tarefa || '',
          valor: deal.total_price || 0,
          tipo: 'forecast',
          vendedor: vendedorAtual,
        };
        
        setNegociacaoNowCompleta(negociacaoMapeada);
      } catch (error) {
        console.error('❌ [CONTROLE] Erro ao buscar negociação "now":', error);
        setNegociacaoNowCompleta(null);
      }
    };
    
    fetchNegociacaoNow();
  }, [negociacaoNowId, negociacoesDoVendedor, vendedorAtual]);
  
  // Função para atualizar o status do deal no RD Station
  const updateDealStatusInRdStation = useCallback(async (dealId: string, status: 'won' | 'ongoing', stageId: string) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
    const apiUrl = `${backendUrl}/api/deals/${dealId}`;
    
    try {
      const updateData: { status: string; stage_id: string } = {
        status,
        stage_id: stageId,
      };
      
      console.log(`🔄 [RD STATION] Atualizando deal ${dealId} para status: ${status}, stage_id: ${stageId}`);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: [{ detail: 'Erro desconhecido' }] }));
        throw new Error(errorData.errors?.[0]?.detail || `Erro ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`✅ [RD STATION] Deal ${dealId} atualizado com sucesso para status: ${status}`, result);
      return result;
    } catch (error) {
      console.error(`❌ [RD STATION] Erro ao atualizar deal ${dealId}:`, error);
      throw error;
    }
  }, []);
  
  // Handler para marcar como vendido
  const handleMarcarComoVendido = useCallback(async () => {
    if (!negociacaoNowId || !metaVendedor || !ownerId || !negociacaoNowCompleta) {
      console.error('❌ [CONTROLE] Não é possível marcar como vendido: dados incompletos');
      return;
    }
    
    const negociacaoAtual = negociacaoNowCompleta;
    if (!negociacaoAtual.valor || negociacaoAtual.valor <= 0) {
      console.error('❌ [CONTROLE] Negociação sem valor');
      return;
    }
    
    // Se já foi vendida, não fazer nada
    if (negociacaoVendida) {
      return;
    }
    
    // Calcular novo valor acumulado
    const novoValorAcumulado = valorAcumulado + negociacaoAtual.valor;
    
    // Atualizar estado local
    setValorAcumulado(novoValorAcumulado);
    setNegociacaoVendida(true);
    
    // Salvar no localStorage
    const storedKey = `valor_acumulado_${vendedorAtual}`;
    localStorage.setItem(storedKey, novoValorAcumulado.toString());
    
    // Marcar negociação como vendida no localStorage
    const vendidaKey = `negociacao_vendida_${negociacaoNowId}`;
    localStorage.setItem(vendidaKey, 'true');
    
    // Enviar atualização via WebSocket com o novo valor acumulado
    if (sendMetaUpdate && metaVendedor) {
      sendMetaUpdate({ 
        vendedor_id: ownerId, 
        vendedor_nome: vendedorAtual, 
        meta: metaVendedor.meta,
        valor_acumulado: novoValorAcumulado,
        negociacao_id: negociacaoNowId, // ID da negociação vendida
        valor_negociacao: negociacaoAtual.valor // Valor da negociação vendida
      });
      console.log('💾 [CONTROLE] Valor acumulado enviado via WebSocket:', novoValorAcumulado);
    }
    
    // Atualizar status do deal no RD Station para "won" e stage_id para etapa de ganho
    try {
      await updateDealStatusInRdStation(negociacaoNowId, 'won', '680166f73bb8fd001417d33d');
    } catch (error) {
      console.error('❌ [CONTROLE] Erro ao atualizar status no RD Station:', error);
      // Continuar mesmo se houver erro na atualização do RD Station
    }
    
    // Salvar venda no banco via API POST (apenas dados do closer; valor do time = somatório após GET)
    fetch('/api/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendedorId: ownerId,
        vendedorNome: vendedorAtual,
        negociacaoId: negociacaoNowId,
        valorNegociacao: negociacaoAtual.valor,
        clienteNumero: negociacaoAtual.numero, // Telefone do cliente associado à deal
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          console.log('✅ [CONTROLE] Venda salva no banco:', data.data);
        } else {
          console.warn('⚠️ [CONTROLE] Erro ao salvar venda no banco:', data.message);
        }
      })
      .catch((err) => {
        console.error('❌ [CONTROLE] Erro ao chamar API de vendas:', err);
      });
  }, [negociacaoNowId, negociacaoNowCompleta, valorAcumulado, metaVendedor, ownerId, vendedorAtual, sendMetaUpdate, negociacaoVendida, updateDealStatusInRdStation]);

  // Handler para reverter venda (chamado após confirmação no diálogo)
  const handleReverterVenda = useCallback(async () => {
    if (!negociacaoNowId || !metaVendedor || !ownerId || !negociacaoVendida || !negociacaoNowCompleta) {
      console.error('❌ [CONTROLE] Não é possível reverter venda: dados incompletos ou não vendida');
      return;
    }
    
    const negociacaoAtual = negociacaoNowCompleta;
    if (!negociacaoAtual.valor || negociacaoAtual.valor <= 0) {
      console.error('❌ [CONTROLE] Negociação sem valor');
      return;
    }
    
    // Reverter valor acumulado
    const novoValorAcumulado = Math.max(0, valorAcumulado - negociacaoAtual.valor);
    
    // Atualizar status do deal no RD Station para "ongoing" e stage_id para etapa de negociação
    try {
      await updateDealStatusInRdStation(negociacaoNowId, 'ongoing', '67b8c721f02f0700145320c6');
    } catch (error) {
      console.error('❌ [CONTROLE] Erro ao atualizar status no RD Station:', error);
      // Continuar mesmo se houver erro na atualização do RD Station
    }
    
    // Remover venda do banco via API DELETE
    const params = new URLSearchParams({
      negociacaoId: negociacaoNowId,
      vendedorId: ownerId,
    });
    fetch(`/api/vendas?${params.toString()}`, {
      method: 'DELETE',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          console.log('✅ [CONTROLE] Venda revertida no banco:', negociacaoNowId);
        } else {
          console.warn('⚠️ [CONTROLE] Erro ao reverter venda no banco:', data.message);
        }
      })
      .catch((err) => {
        console.error('❌ [CONTROLE] Erro ao chamar API de delete venda:', err);
      });
    
    // Atualizar estado local
    setValorAcumulado(novoValorAcumulado);
    setNegociacaoVendida(false);
    
    // Salvar no localStorage
    const storedKey = `valor_acumulado_${vendedorAtual}`;
    localStorage.setItem(storedKey, novoValorAcumulado.toString());
    
    // Remover marcação de vendida do localStorage
    const vendidaKey = `negociacao_vendida_${negociacaoNowId}`;
    localStorage.removeItem(vendidaKey);
    
    // Enviar atualização via WebSocket com o novo valor acumulado
    if (sendMetaUpdate && metaVendedor) {
      sendMetaUpdate({ 
        vendedor_id: ownerId, 
        vendedor_nome: vendedorAtual, 
        meta: metaVendedor.meta,
        valor_acumulado: novoValorAcumulado 
      });
      console.log('🔄 [CONTROLE] Valor acumulado revertido enviado via WebSocket:', novoValorAcumulado);
    }
  }, [negociacaoNowId, negociacaoNowCompleta, valorAcumulado, metaVendedor, ownerId, vendedorAtual, negociacaoVendida, sendMetaUpdate, updateDealStatusInRdStation]);

  // Função para formatar número para o formato "+55 ddd number"
  const formatPhoneNumber = useCallback((phone: string): string => {
    // Remove todos os caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    
    // Se já começa com 55, assume formato internacional
    if (cleaned.startsWith('55')) {
      const ddd = cleaned.substring(2, 4);
      const number = cleaned.substring(4);
      return `+55 ${ddd} ${number}`;
    }
    
    // Se tem 11 dígitos (DDD + número com 9 dígitos), assume formato nacional
    if (cleaned.length === 11) {
      const ddd = cleaned.substring(0, 2);
      const number = cleaned.substring(2);
      return `+55 ${ddd} ${number}`;
    }
    
    // Se tem 10 dígitos (DDD + número com 8 dígitos), assume formato nacional
    if (cleaned.length === 10) {
      const ddd = cleaned.substring(0, 2);
      const number = cleaned.substring(2);
      return `+55 ${ddd} ${number}`;
    }
    
    // Se não se encaixa em nenhum formato, retorna como está com +55
    return cleaned.length > 0 ? `+55 ${cleaned}` : '';
  }, []);

  // Handler para abrir edição de número
  const handleEditPhone = useCallback((contactId: string, currentPhone: string) => {
    // Remover formatação do número atual para edição
    const cleanedPhone = currentPhone ? currentPhone.replace(/\D/g, '') : '';
    setEditingContactId(contactId);
    setEditingPhoneNumber(cleanedPhone);
  }, []);

  // Handler para salvar número editado
  const handleSavePhone = useCallback(async () => {
    if (!editingContactId || !editingPhoneNumber.trim()) {
      console.error('❌ [CONTROLE] Dados incompletos para salvar número');
      return;
    }

    setUpdatingPhone(true);
    
    try {
      // Formatar número para "+55 ddd number"
      const formattedPhone = formatPhoneNumber(editingPhoneNumber);
      
      console.log(`🔄 [CONTROLE] Atualizando telefone do contato ${editingContactId} para: ${formattedPhone}`);
      
      const response = await fetch(`/api/contacts/${editingContactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phones: [
            {
              phone: formattedPhone,
              type: 'mobile',
            },
          ],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.errors?.[0]?.detail || result.message || 'Erro ao atualizar telefone');
      }

      console.log('✅ [CONTROLE] Telefone atualizado com sucesso:', result);
      
      // Atualizar o número na negociação atual se for a mesma
      if (negociacaoNowCompleta && negociacaoNowCompleta.contact_id === editingContactId) {
        setNegociacaoNowCompleta({
          ...negociacaoNowCompleta,
          numero: formattedPhone,
        });
      }
      
      // Atualizar o número nas negociações do vendedor
      setNegociacoesDoVendedor((prev) =>
        prev.map((neg) =>
          neg.contact_id === editingContactId
            ? { ...neg, numero: formattedPhone }
            : neg
        )
      );
      
      // Fechar o dialog
      setEditingContactId(null);
      setEditingPhoneNumber('');
      
    } catch (error) {
      console.error('❌ [CONTROLE] Erro ao atualizar telefone:', error);
      alert(`Erro ao atualizar telefone: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setUpdatingPhone(false);
      setEditingContactId(null);
      setEditingPhoneNumber('');
    }
  }, [editingContactId, editingPhoneNumber, formatPhoneNumber, negociacaoNowCompleta, setNegociacoesDoVendedor]);

  // Handler para cancelar edição
  const handleCancelEditPhone = useCallback(() => {
    setEditingContactId(null);
    setEditingPhoneNumber('');
  }, []);

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
    setBuscandoNegociacoes(true);
    
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
          setBuscandoNegociacoes(false);
          fetchingRef.current = false;
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
          setBuscandoNegociacoes(false);
          fetchingRef.current = false;
          return;
        }

        // Mapear deals da API para o formato interno
        if (data.data && Array.isArray(data.data)) {
          // Obter o estado atual do WebSocket para aplicar isNow corretamente
          // Isso garante que mesmo após paginação, o estado "now" seja mantido
          const currentNowId = negociacaoNowId;
          
          const negociacoesMapeadas = data.data.map((deal: any) => {
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
            
            // Log para debug - remover depois se necessário
            if (deal.custom_fields && Object.keys(deal.custom_fields).length > 0) {
              console.log(`📞 [CONTROLE] Deal ${deal.id} - Custom fields:`, deal.custom_fields);
              console.log(`📞 [CONTROLE] Número encontrado:`, numero || 'Nenhum número encontrado');
            }
            
            return {
              id: deal.id,
              cliente: deal.name,
              numero: numero,
              contact_id: deal.contact_ids?.[0] || deal.contacts?.[0]?.id || undefined, // ID do primeiro contato associado
              status: mapRdStatusToInternal(deal.status),
              // Priorizar o estado do WebSocket sobre o campo da API
              // Quando há paginação, o estado do WebSocket sempre prevalece
              isNow: currentNowId === deal.id,
              tarefa: deal.custom_fields?.tarefa || '',
              valor: deal.total_price || 0,
            };
          });
          
          setNegociacoesDoVendedor(negociacoesMapeadas);
          
          // Verificar se há mais páginas disponíveis
          setHasMorePages(!!data.links?.next);
        } else {
          setNegociacoesDoVendedor([]);
          setHasMorePages(false);
        }
        
        console.log('🚀 [FRONT] Processamento concluído com sucesso');
        setLoading(false);
        setBuscandoNegociacoes(false);
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
        setBuscandoNegociacoes(false);
        fetchingRef.current = false;
        
        // Em caso de erro, limpar dados
        setNegociacoesDoVendedor([]);
        setHasMorePages(false);
      }
    };

    fetchDeals();
  }, [vendedorAtual, currentPage, pageSize]);

  // Buscar todas as páginas quando há termo de busca
  useEffect(() => {
    if (!searchTerm.trim()) {
      // Se não há busca, limpar todas as negociações e usar paginação normal
      setTodasNegociacoes([]);
      return;
    }

    // Se há busca, fazer uma única requisição com tamanho grande para buscar todos os deals
    const buscarTodasPaginas = async () => {
      setBuscandoTodasPaginas(true);
      const ownerId = getVendedorId(vendedorAtual);

      try {
        // Fazer uma única requisição com tamanho grande (10000 deve cobrir a maioria dos casos)
        const params = new URLSearchParams();
        if (ownerId) {
          params.append('owner_id', ownerId);
        }
        params.append('page', '1');
        params.append('size', '10000'); // Tamanho grande para buscar todos de uma vez
        
        const url = `/api/deals?${params.toString()}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('Erro ao buscar todas as páginas:', response.status);
          setTodasNegociacoes([]);
          return;
        }

        const data = await response.json();
        
        if (data.data && Array.isArray(data.data)) {
          const currentNowId = negociacaoNowId;
          
          const negociacoesMapeadas = data.data.map((deal: any) => {
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
            
            return {
              id: deal.id,
              cliente: deal.name,
              numero: numero,
              status: mapRdStatusToInternal(deal.status),
              isNow: deal.id === currentNowId,
              valor: deal.value || 0,
              updated_at: deal.updated_at || deal.created_at || new Date().toISOString(),
            };
          });
          
          setTodasNegociacoes(negociacoesMapeadas);
        } else {
          setTodasNegociacoes([]);
        }
      } catch (error) {
        console.error('Erro ao buscar todas as páginas:', error);
        setTodasNegociacoes([]);
      } finally {
        setBuscandoTodasPaginas(false);
      }
    };

    // Debounce para evitar muitas requisições enquanto o usuário digita
    const timeoutId = setTimeout(() => {
      buscarTodasPaginas();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, vendedorAtual, negociacaoNowId]);

  // Filtrar negociações pelo termo de pesquisa
  const negociacoesFiltradas = useMemo(() => {
    // Se há busca, usar todas as negociações acumuladas
    const negociacoesParaFiltrar = searchTerm.trim() ? todasNegociacoes : negociacoesDoVendedor;
    
    if (!searchTerm.trim()) {
      return negociacoesParaFiltrar;
    }
    
    const termoLower = searchTerm.toLowerCase().trim();
    return negociacoesParaFiltrar.filter((negociacao) =>
      negociacao.cliente.toLowerCase().includes(termoLower)
    );
  }, [negociacoesDoVendedor, todasNegociacoes, searchTerm]);
  
  // Calcular paginação para resultados filtrados
  const negociacoesPaginadas = useMemo(() => {
    if (!searchTerm.trim()) {
      // Sem busca, usar dados normais (já paginados pela API)
      return negociacoesFiltradas;
    }
    
    // Com busca, aplicar paginação local nos resultados filtrados
    const inicio = (currentPage - 1) * pageSize;
    const fim = inicio + pageSize;
    return negociacoesFiltradas.slice(inicio, fim);
  }, [negociacoesFiltradas, currentPage, pageSize, searchTerm]);
  
  // Calcular se há mais páginas quando há busca
  const hasMorePagesComBusca = useMemo(() => {
    if (!searchTerm.trim()) {
      return hasMorePages;
    }
    const totalPaginas = Math.ceil(negociacoesFiltradas.length / pageSize);
    return currentPage < totalPaginas;
  }, [searchTerm, negociacoesFiltradas.length, currentPage, pageSize, hasMorePages]);


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
        const updated = prev.map((neg) => ({
          ...neg,
          isNow: neg.id === negociacaoNowId,
        }));
        
        // Atualizar também negociacaoNowCompleta se a negociação está na lista atual
        const negociacaoNaLista = updated.find(neg => neg.id === negociacaoNowId);
        if (negociacaoNaLista && !negociacaoNowCompleta) {
          setNegociacaoNowCompleta(negociacaoNaLista);
        }
        
        return updated;
      } else {
        // Verificar se precisa limpar
        const needsUpdate = prev.some((neg) => neg.isNow);
        
        if (!needsUpdate) return prev;
        
        // Se não há deal "now", limpar todos os flags
        setNegociacaoNowCompleta(null);
        return prev.map((neg) => ({
          ...neg,
          isNow: false,
        }));
      }
    });
  }, [negociacaoNowId, negociacaoNowCompleta]); // Aplicar quando o estado do WebSocket mudar
  
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
    router.push(`/controle-closers/${slug}`);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (hasMorePagesComBusca) {
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
        // Buscar nome e número do cliente da negociação
        const negociacao = negociacoesDoVendedor.find(n => n.id === negociacaoId);
        const clienteNome = negociacao?.cliente || 'Cliente';
        const clienteNumero = negociacao?.numero;
        
        const updateData = {
          deal_id: negociacaoId,
          is_now: true,
          updated_at: new Date().toISOString(),
          owner_id: ownerId,
          vendedor_nome: vendedorAtual,
          cliente_nome: clienteNome,
          cliente_numero: clienteNumero,
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
      <div className="relative z-10 min-h-screen flex flex-col w-full min-w-0 max-w-full" style={{ padding: 'clamp(0.75rem, 1.5vw, 1.5rem)' }}>
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
            Controle de Negociações - Closers
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
          {/* Exibir para todos os vendedores que estão na lista de vendedores válidos */}
          {vendedorAtual && vendedores.includes(vendedorAtual) && (
            <div className="mb-3 md:mb-4">
              <MetaInput
                vendedorNome={vendedorAtual}
                vendedorId={ownerId || ''}
                metaAtual={metaVendedor?.meta}
                valorAcumulado={valorAcumulado}
                onSave={handleSaveMeta}
                isLoading={!wsConnected}
              />
            </div>
          )}

          {/* Botões para criar forecast manual e call manual */}
          {!negociacaoSelecionadaParaForecast && !forecastSendoEditado && !criandoForecastManual && !criandoCallManual && vendedorAtual && vendedores.includes(vendedorAtual) && (
            <div className="mb-3 md:mb-4">
              <div className="mb-2 p-3 bg-[#2A2A2A]/50 border border-[#3A3A3A] rounded-lg">
                <p className="text-[#CCCCCC] text-center" style={{ fontSize: 'clamp(0.6875rem, 1.2vw, 0.8125rem)' }}>
                  💡 <strong>Dica:</strong> Use o Forecast Manual quando o cliente ainda não possui dados cadastrados no CRM (RD Station). Use o Call Manual para registrar reuniões sem negociação no CRM.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleCriarForecastManual}
                  className="flex-1 bg-[#fed094] hover:bg-[#fed094]/80 text-black"
                  style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', padding: 'clamp(0.625rem, 1vw, 0.75rem)' }}
                >
                  <Calendar className="mr-2 flex-shrink-0" style={{ width: 'clamp(0.875rem, 1.5vw, 1rem)', height: 'clamp(0.875rem, 1.5vw, 1rem)' }} />
                  Criar Forecast Manual
                </Button>
                <Button
                  onClick={handleCriarCallManual}
                  className="flex-1 bg-[#3b82f6] hover:bg-[#3b82f6]/80 text-white"
                  style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', padding: 'clamp(0.625rem, 1vw, 0.75rem)' }}
                >
                  <PhoneCall className="mr-2 flex-shrink-0" style={{ width: 'clamp(0.875rem, 1.5vw, 1rem)', height: 'clamp(0.875rem, 1.5vw, 1rem)' }} />
                  Criar Call Manual
                </Button>
              </div>
            </div>
          )}

          {/* Formulário de Call Manual */}
          {criandoCallManual && vendedorAtual && vendedores.includes(vendedorAtual) && (
            <div className="mb-3 md:mb-4">
              <ReuniaoForm
                closerNome={vendedorAtual}
                vendedorId={ownerId || ''}
                onSave={handleSaveReuniao}
                onCancel={handleCancelReuniao}
                isLoading={savingReuniao}
              />
            </div>
          )}

          {/* Formulário de Forecast */}
          {/* Exibir para todos os vendedores que estão na lista de vendedores válidos */}
          {(negociacaoSelecionadaParaForecast || forecastSendoEditado || criandoForecastManual) && vendedorAtual && vendedores.includes(vendedorAtual) && (
            <div className="mb-3 md:mb-4">
              <ForecastForm
                negociacao={negociacaoSelecionadaParaForecast}
                forecast={forecastSendoEditado}
                closerNome={vendedorAtual}
                vendedorId={ownerId || ''}
                onSave={handleSaveForecast}
                onCancel={handleCancelForecast}
                isLoading={!wsConnected}
              />
            </div>
          )}

          {/* Lista de Forecasts Existentes */}
          {forecastsDoVendedor.length > 0 && vendedorAtual && vendedores.includes(vendedorAtual) && (
            <div className="mb-3 md:mb-4">
              <Card className="bg-[#2A2A2A]/50 border border-[#3A3A3A]">
                <CardHeader style={{ padding: 'clamp(0.625rem, 1vw, 0.875rem)' }}>
                  <CardTitle className="text-white" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.125rem)' }}>
                    Forecasts Cadastrados ({forecastsDoVendedor.length})
                  </CardTitle>
                </CardHeader>
                <CardContent style={{ padding: 'clamp(0.625rem, 1vw, 0.875rem)' }}>
                  <div className="space-y-2">
                    {forecastsDoVendedor.map((forecast) => {
                      const formatDate = (dateString: string) => {
                        if (!dateString) return 'N/A';
                        const date = new Date(dateString);
                        return date.toLocaleDateString('pt-BR');
                      };
                      
                      return (
                        <div
                          key={forecast.id}
                          className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-lg p-3 md:p-4 hover:border-[#fed094]/50 transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 min-w-0">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 min-w-0">
                              <div>
                                <p className="text-[#CCCCCC] text-xs mb-1">Cliente</p>
                                <p className="text-white font-medium" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>
                                  {forecast.clienteNome}
                                </p>
                              </div>
                              <div>
                                <p className="text-[#CCCCCC] text-xs mb-1">Data/Horário</p>
                                <p className="text-white" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>
                                  {formatDate(forecast.data)} {forecast.horario && `- ${forecast.horario}`}
                                </p>
                              </div>
                              <div>
                                <p className="text-[#CCCCCC] text-xs mb-1">Valor</p>
                                <p className="text-white font-semibold" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>
                                  {forecast.valor > 0 ? formatCurrency(forecast.valor) : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[#CCCCCC] text-xs mb-1">Primeira Call</p>
                                <p className="text-white" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>
                                  {forecast.primeiraCall ? formatDate(forecast.primeiraCall) : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 flex-shrink-0">
                              <Button
                                onClick={() => handleEditForecast(forecast)}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                                style={{ 
                                  fontSize: 'clamp(0.6875rem, 1.2vw, 0.8125rem)', 
                                  padding: 'clamp(0.375rem, 0.8vw, 0.5rem) clamp(0.75rem, 1.2vw, 1rem)',
                                  minHeight: 'clamp(1.75rem, 2.5vw, 2.25rem)',
                                }}
                              >
                                <Edit className="mr-1.5 flex-shrink-0" style={{ width: 'clamp(0.75rem, 1.2vw, 0.875rem)', height: 'clamp(0.75rem, 1.2vw, 0.875rem)' }} />
                                Editar
                              </Button>
                              <Button
                                onClick={() => handleDeleteForecast(forecast.id)}
                                className="bg-red-600 text-white hover:bg-red-700"
                                style={{ 
                                  fontSize: 'clamp(0.6875rem, 1.2vw, 0.8125rem)', 
                                  padding: 'clamp(0.375rem, 0.8vw, 0.5rem) clamp(0.75rem, 1.2vw, 1rem)',
                                  minHeight: 'clamp(1.75rem, 2.5vw, 2.25rem)',
                                }}
                              >
                                <Trash2 className="mr-1.5 flex-shrink-0" style={{ width: 'clamp(0.75rem, 1.2vw, 0.875rem)', height: 'clamp(0.75rem, 1.2vw, 0.875rem)' }} />
                                Remover
                              </Button>
                            </div>
                          </div>
                          {forecast.observacoes && (
                            <div className="mt-2 pt-2 border-t border-[#3A3A3A]">
                              <p className="text-[#CCCCCC] text-xs mb-1">Observações</p>
                              <p className="text-white" style={{ fontSize: 'clamp(0.75rem, 1.3vw, 0.875rem)' }}>
                                {forecast.observacoes}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Destaque da Negociação "Now" - Abaixo dos Forecasts e Switch */}
          {negociacaoNowCompleta && negociacaoNowId && (() => {
            const negociacaoNow = negociacaoNowCompleta;
            
            return (
              <div className="mb-3 md:mb-4 flex justify-center">
                <Card className={cn(
                  "border-2 shadow-lg max-w-2xl w-full",
                  negociacaoVendida 
                    ? "border-green-500 bg-[#1A1A1A]/90 shadow-green-500/20" 
                    : "border-[#fed094] bg-[#1A1A1A]/80 shadow-[#fed094]/20"
                )}>
                  <CardContent style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Informações da Negociação */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div 
                            className={cn(
                              "flex-shrink-0 flex items-center justify-center rounded-md px-2 py-1",
                              negociacaoVendida 
                                ? "bg-green-500 text-white" 
                                : "bg-[#fed094] text-[#1A1A1A]"
                            )}
                            style={!negociacaoVendida ? {
                              animation: 'gentle-pulse 2s ease-in-out infinite',
                            } : {}}
                          >
                            <Check className="mr-1" style={{ width: 'clamp(0.875rem, 1.5vw, 1rem)', height: 'clamp(0.875rem, 1.5vw, 1rem)' }} />
                            <span className="font-bold" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)' }}>
                              In call
                            </span>
                          </div>
                          <h3 className="text-white font-semibold truncate" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.125rem)' }}>
                            {negociacaoNow.cliente}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap mt-2">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="text-[#fed094]" style={{ width: 'clamp(0.875rem, 1.5vw, 1rem)', height: 'clamp(0.875rem, 1.5vw, 1rem)' }} />
                            <span className="text-white font-bold" style={{ fontSize: 'clamp(0.875rem, 1.8vw, 1.125rem)' }}>
                              {negociacaoNow.valor && negociacaoNow.valor > 0 
                                ? formatCurrency(negociacaoNow.valor)
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2 flex-shrink-0 md:self-start" style={{ marginTop: 'clamp(1rem, 2vw, 1.25rem)', marginBottom: '0' }}>
                        {negociacaoVendida ? (
                          <>
                            {/* Botão Reverter */}
                            <Button
                              onClick={() => setShowReverterConfirm(true)}
                              className="bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-[#3A3A3A] flex items-center gap-2"
                              style={{ 
                                fontSize: 'clamp(0.875rem, 1.5vw, 1rem)', 
                                padding: 'clamp(0.5rem, 1vw, 0.75rem) clamp(1rem, 1.5vw, 1.5rem)',
                                minHeight: 'clamp(2.5rem, 4vw, 3rem)',
                              }}
                            >
                              <RotateCcw className="rotate-[-180deg]" style={{ width: 'clamp(1rem, 1.5vw, 1.25rem)', height: 'clamp(1rem, 1.5vw, 1.25rem)' }} />
                              Reverter
                            </Button>
                            {/* Botão Vendido (verde quando vendido) */}
                            <Button
                              disabled
                              className="bg-green-600 text-white cursor-not-allowed flex items-center gap-2"
                              style={{ 
                                fontSize: 'clamp(0.875rem, 1.5vw, 1rem)', 
                                padding: 'clamp(0.5rem, 1vw, 0.75rem) clamp(1rem, 1.5vw, 1.5rem)',
                                minHeight: 'clamp(2.5rem, 4vw, 3rem)',
                              }}
                            >
                              <CheckCircle2 style={{ width: 'clamp(1rem, 1.5vw, 1.25rem)', height: 'clamp(1rem, 1.5vw, 1.25rem)' }} />
                              Vendido
                            </Button>
                          </>
                        ) : (
                          /* Botão Vendido (estado não vendido) */
                          <Button
                            onClick={handleMarcarComoVendido}
                            className="bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-[#3A3A3A] flex items-center gap-2"
                            style={{ 
                              fontSize: 'clamp(0.875rem, 1.5vw, 1rem)', 
                              padding: 'clamp(0.5rem, 1vw, 0.75rem) clamp(1rem, 1.5vw, 1.5rem)',
                              minHeight: 'clamp(2.5rem, 4vw, 3rem)',
                            }}
                          >
                            <CheckCircle2 style={{ width: 'clamp(1rem, 1.5vw, 1.25rem)', height: 'clamp(1rem, 1.5vw, 1.25rem)' }} />
                            Vendido
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Toggle de visualização - Após Forecasts Cadastrados */}
          <div className="mb-3 md:mb-4 flex flex-wrap justify-end">
            <div className="flex items-center gap-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg p-1 flex-shrink-0">
              <Button
                onClick={() => {
                  setVisualizacao('lista');
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(`controle_visualizacao_${vendedorAtual}`, 'lista');
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5",
                  visualizacao === 'lista' 
                    ? "bg-[#fed094] text-[#1A1A1A] hover:bg-[#fed094]/90" 
                    : "bg-transparent text-[#CCCCCC] hover:bg-[#3A3A3A]"
                )}
                style={{ 
                  fontSize: 'clamp(0.6875rem, 1.2vw, 0.8125rem)', 
                  padding: 'clamp(0.375rem, 0.8vw, 0.5rem) clamp(0.75rem, 1.2vw, 1rem)',
                  minHeight: 'clamp(1.75rem, 2.5vw, 2.25rem)',
                }}
              >
                <List style={{ width: 'clamp(0.875rem, 1.2vw, 1rem)', height: 'clamp(0.875rem, 1.2vw, 1rem)' }} />
                Lista
              </Button>
              <Button
                onClick={() => {
                  setVisualizacao('cards');
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(`controle_visualizacao_${vendedorAtual}`, 'cards');
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5",
                  visualizacao === 'cards' 
                    ? "bg-[#fed094] text-[#1A1A1A] hover:bg-[#fed094]/90" 
                    : "bg-transparent text-[#CCCCCC] hover:bg-[#3A3A3A]"
                )}
                style={{ 
                  fontSize: 'clamp(0.6875rem, 1.2vw, 0.8125rem)', 
                  padding: 'clamp(0.375rem, 0.8vw, 0.5rem) clamp(0.75rem, 1.2vw, 1rem)',
                  minHeight: 'clamp(1.75rem, 2.5vw, 2.25rem)',
                }}
              >
                <Grid style={{ width: 'clamp(0.875rem, 1.2vw, 1rem)', height: 'clamp(0.875rem, 1.2vw, 1rem)' }} />
                Cards
              </Button>
            </div>
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-300" style={{ fontSize: 'clamp(0.875rem, 1.2vw, 1rem)' }}>
                ⚠️ {error}
              </p>
            </div>
          )}

          {/* Lista de negociações - Lista ou Cards */}
          {(loading || buscandoTodasPaginas || buscandoNegociacoes) ? (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-[#fed094]" style={{ width: 'clamp(2rem, 3vw, 3rem)', height: 'clamp(2rem, 3vw, 3rem)' }} />
                <p className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)' }}>
                  {buscandoTodasPaginas ? 'Buscando em todas as páginas...' : 'Carregando negociações...'}
                </p>
              </div>
            </div>
          ) : negociacoesFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)' }}>
                {searchTerm.trim() ? 'Nenhuma negociação encontrada com esse nome.' : 'Nenhuma negociação disponível.'}
              </p>
            </div>
          ) : visualizacao === 'lista' ? (
            // Visualização em Lista (Tabela) - colunas Cliente e Ações fixas nas pontas, Valor justificado no meio
            <div className="w-full overflow-x-auto scrollbar-hide -mx-1 flex justify-center">
              <div className="inline-block min-w-0 w-full max-w-[936px] mx-auto">
                <table className="border-collapse w-full" style={{ tableLayout: 'fixed', borderSpacing: '0 0', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '220px' }} />
                    <col style={{ width: '436px' }} />
                    <col style={{ width: '280px' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[#3A3A3A]">
                      <th className="text-left text-[#CCCCCC] py-2 pl-4 pr-3" style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)', fontWeight: 600, width: '220px', minWidth: '220px', maxWidth: '220px' }}>
                        Cliente
                      </th>
                      <th className="text-center text-[#CCCCCC] py-2 pl-3 pr-12" style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)', fontWeight: 600 }}>
                        Valor
                      </th>
                      <th className="text-center text-[#CCCCCC] py-2 px-4" style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)', fontWeight: 600, width: '280px', minWidth: '280px', maxWidth: '280px' }}>
                        Ações
                      </th>
                    </tr>
                  </thead>
                <tbody>
                  {negociacoesPaginadas.map((negociacao) => {
                    const isNow = negociacaoNowId === negociacao.id;
                    // Verificar se esta negociação já tem um forecast cadastrado
                    const temForecast = forecastsDoVendedor.some(f => f.negociacaoId === negociacao.id);

                    return (
                      <tr
                        key={negociacao.id}
                        className={cn(
                          "border-b border-[#3A3A3A]/50 hover:bg-[#2A2A2A]/50 transition-colors",
                          isNow && "bg-transparent border-l-4 border-l-[#fed094]"
                        )}
                      >
                        <td className="py-2 pl-4 pr-3" style={{ width: '220px', minWidth: '220px', maxWidth: '220px' }}>
                          <div className="flex items-center gap-2 min-w-0">
                            {isNow && (
                              <div className="w-2 h-2 rounded-full bg-[#fed094] flex-shrink-0" />
                            )}
                            <span className="text-white font-medium truncate" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>
                              {negociacao.cliente}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 pl-3 pr-12 text-center">
                          <div className="flex items-center justify-center gap-1.5 w-full">
                            <DollarSign className="text-[#CCCCCC] flex-shrink-0" style={{ width: 'clamp(0.75rem, 1.2vw, 0.875rem)', height: 'clamp(0.75rem, 1.2vw, 0.875rem)' }} />
                            <span className="text-white font-semibold whitespace-nowrap" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>
                              {negociacao.valor && negociacao.valor > 0 
                                ? formatCurrency(negociacao.valor)
                                : 'N/A'
                              }
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-4" style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }}>
                          <div className="flex flex-nowrap justify-center items-center gap-2">
                            <Button
                              onClick={() => handleSetNow(negociacao.id)}
                              className={cn(
                                "whitespace-nowrap flex-shrink-0",
                                isNow ? "bg-[#fed094]/20 text-[#fed094] hover:bg-[#fed094]/30 border border-[#fed094]" : "bg-[#2A2A2A] text-white hover:bg-[#3A3A3A]"
                              )}
                              style={{ 
                                fontSize: 'clamp(0.6875rem, 1.2vw, 0.8125rem)', 
                                padding: 'clamp(0.375rem, 0.8vw, 0.5rem) clamp(0.5rem, 1vw, 0.75rem)',
                                minHeight: 'clamp(1.75rem, 2.5vw, 2.25rem)',
                                minWidth: 'clamp(110px, 14vw, 140px)',
                              }}
                            >
                              {isNow ? (
                                <>
                                  <Check className="mr-1.5 flex-shrink-0" style={{ width: 'clamp(0.75rem, 1.2vw, 0.875rem)', height: 'clamp(0.75rem, 1.2vw, 0.875rem)' }} />
                                  Agora
                                </>
                              ) : (
                                'Definir como Agora'
                              )}
                            </Button>
                            <Button
                              onClick={() => handleSelecionarForecast(negociacao)}
                              className={cn(
                                "whitespace-nowrap flex-shrink-0",
                                negociacaoSelecionadaParaForecast?.id === negociacao.id 
                                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                                  : temForecast
                                    ? "bg-blue-600/80 text-white hover:bg-blue-700 border-2 border-blue-400"
                                    : "bg-[#2A2A2A] text-white hover:bg-[#3A3A3A]"
                              )}
                              style={{ 
                                fontSize: 'clamp(0.6875rem, 1.2vw, 0.8125rem)', 
                                padding: 'clamp(0.375rem, 0.8vw, 0.5rem) clamp(0.5rem, 1vw, 0.75rem)',
                                minHeight: 'clamp(1.75rem, 2.5vw, 2.25rem)',
                                minWidth: 'clamp(90px, 12vw, 120px)',
                              }}
                            >
                              <Calendar className="mr-1.5 flex-shrink-0 text-white" style={{ width: 'clamp(0.75rem, 1.2vw, 0.875rem)', height: 'clamp(0.75rem, 1.2vw, 0.875rem)' }} />
                              {negociacaoSelecionadaParaForecast?.id === negociacao.id ? 'Editando' : temForecast ? 'Forecast ✓' : 'Forecast'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          ) : (
            // Visualização em Cards
            <div 
              className="grid gap-2 md:gap-3 lg:gap-4 w-full"
              style={{ 
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                maxWidth: '100%',
              }}
            >
                  {negociacoesPaginadas.map((negociacao) => {
                    const isNow = negociacaoNowId === negociacao.id;
                // Verificar se esta negociação já tem um forecast cadastrado
                const temForecast = forecastsDoVendedor.some(f => f.negociacaoId === negociacao.id);

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

                        {/* Botões de ação */}
                        <div className="flex flex-col gap-2">
                          {/* Botão para definir como "now" */}
                          <Button
                            onClick={() => handleSetNow(negociacao.id)}
                            className={cn(
                              "w-full",
                              isNow ? "bg-[#fed094]/20 text-[#fed094] hover:bg-[#fed094]/30 border border-[#fed094]" : "bg-[#2A2A2A] text-white hover:bg-[#3A3A3A]"
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

                          {/* Botão para adicionar Forecast */}
                          <Button
                            onClick={() => handleSelecionarForecast(negociacao)}
                            className={cn(
                              "w-full",
                              negociacaoSelecionadaParaForecast?.id === negociacao.id 
                                ? "bg-blue-600 text-white hover:bg-blue-700" 
                                : temForecast
                                  ? "bg-blue-600/80 text-white hover:bg-blue-700 border-2 border-blue-400"
                                  : "bg-[#2A2A2A] text-white hover:bg-[#3A3A3A]"
                            )}
                            style={{ 
                              fontSize: 'clamp(0.6875rem, 1.5vw, 0.875rem)', 
                              padding: 'clamp(0.5rem, 1vw, 0.625rem)',
                              minHeight: 'clamp(2rem, 3vw, 2.5rem)',
                            }}
                          >
                            <Calendar className="mr-1.5 md:mr-2 flex-shrink-0 text-white" style={{ width: 'clamp(0.75rem, 1.5vw, 0.875rem)', height: 'clamp(0.75rem, 1.5vw, 0.875rem)' }} />
                            {negociacaoSelecionadaParaForecast?.id === negociacao.id ? 'Editando Forecast' : temForecast ? 'Forecast ✓' : 'Adicionar Forecast'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Controles de Paginação */}
          {!loading && !buscandoTodasPaginas && negociacoesFiltradas.length > 0 && (currentPage > 1 || hasMorePagesComBusca) && (
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mt-6 md:mt-8">
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
                disabled={!hasMorePagesComBusca || loading}
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
        </div>
      </div>

      {/* Diálogo de confirmação - Remover forecast */}
      <ConfirmDialog
        open={deleteForecastId !== null}
        onOpenChange={(open) => !open && setDeleteForecastId(null)}
        title="Remover forecast"
        description="Tem certeza que deseja remover este forecast? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        variant="destructive"
        icon="trash"
        onConfirm={() => deleteForecastId && executeDeleteForecast(deleteForecastId)}
      />

      {/* Diálogo de confirmação - Reverter venda */}
      <ConfirmDialog
        open={showReverterConfirm}
        onOpenChange={setShowReverterConfirm}
        title="Reverter venda"
        description="Tem certeza que deseja reverter esta venda? O valor será removido do acumulado do dia."
        confirmLabel="Reverter"
        cancelLabel="Cancelar"
        variant="default"
        icon="revert"
        onConfirm={handleReverterVenda}
      />

      {/* Dialog para editar número do contato */}
      {editingContactId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-phone-dialog-title"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleCancelEditPhone}
            aria-hidden="true"
          />

          {/* Dialog */}
          <Card className="relative z-10 w-full max-w-md border-2 border-[#3A3A3A] bg-[#1A1A1A] shadow-2xl">
            <CardHeader>
              <CardTitle id="edit-phone-dialog-title" className="text-white text-lg">
                Editar Número do Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-[#CCCCCC] mb-2">
                  Número de Telefone
                </label>
                <input
                  type="tel"
                  value={editingPhoneNumber}
                  onChange={(e) => setEditingPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="11999999999"
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-[#666] focus:outline-none focus:border-[#fed094]"
                  disabled={updatingPhone}
                />
                <p className="text-xs text-[#999] mt-1">
                  Formato: DDD + Número (ex: 11999999999)
                </p>
                {editingPhoneNumber && (
                  <p className="text-xs text-[#fed094] mt-1">
                    Será salvo como: {formatPhoneNumber(editingPhoneNumber)}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancelEditPhone}
                disabled={updatingPhone}
                className="border-[#3A3A3A] text-[#CCCCCC] hover:bg-[#2A2A2A] hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSavePhone}
                disabled={updatingPhone || !editingPhoneNumber.trim()}
                className="bg-[#fed094] text-[#1A1A1A] hover:bg-[#fed094]/90"
              >
                {updatingPhone ? 'Salvando...' : 'Salvar'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
