'use client';

import { Forecast, ClassificacaoForecast } from '@/lib/types/forecast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useMemo, useRef } from 'react';
import type { AlertaHoraProxima } from '@/components/painel/closer-card';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

interface ForecastTableProps {
  forecasts: Forecast[];
  vendedorNome: string;
  alerta: AlertaHoraProxima | null;
}

export function ForecastTable({ forecasts, vendedorNome, alerta }: ForecastTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<{ direction: 'down' | 'up'; intervalId: NodeJS.Timeout | null }>({ direction: 'down', intervalId: null });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Ordenar forecasts por hora (crescente); sem hora vai para o final
  const forecastsOrdenados = useMemo(() => {
    return [...forecasts].sort((a, b) => {
      const horaA = a.horario || '';
      const horaB = b.horario || '';
      if (!horaA && !horaB) return 0;
      if (!horaA) return 1;
      if (!horaB) return -1;
      return horaA.localeCompare(horaB);
    });
  }, [forecasts]);

  // Função para obter emoji da classificação
  const getEmojiClassificacao = (classificacao?: ClassificacaoForecast): string => {
    switch (classificacao) {
      case 'quente':
        return '🥵';
      case 'morno':
        return '😐';
      case 'frio':
        return '🥶';
      default:
        return '';
    }
  };

  // Calcular altura fixa para exatamente 4 linhas de forecast visíveis
  // Altura por linha de dados: padding top/bottom (clamp(1.455rem, 2.911vw, 1.747rem) * 2) + altura do texto (~1rem) = ~4.5rem
  // Header da tabela: padding top/bottom (clamp(0.506rem, 1.012vw, 0.759rem) * 2) + altura do texto (~0.9rem) = ~2.2rem
  // 4 linhas de dados: 4 * 4.5rem = ~18rem
  // Total para área de scroll: header (2.2rem) + 4 linhas (18rem) = ~20.2rem
  // Adicionar um pouco de espaço para garantir que 4 linhas fiquem visíveis
  const fixedHeightFor4Rows = 'clamp(18rem, 19vw, 19rem)';
  const totalCardHeight = `calc(${fixedHeightFor4Rows} + clamp(2.5rem, 3vw, 3rem))`;
  const tablePaddingLeft = 'clamp(0.6325rem, 1.2144vw, 0.759rem)';
  const titleBottomMargin = 'clamp(0.5rem, 1vw, 1rem)';

  // Scroll automático quando há 4 ou mais forecasts - DEVE vir antes de qualquer return condicional
  useEffect(() => {
    if (forecasts.length < 4 || !scrollContainerRef.current) {
      if (autoScrollRef.current.intervalId) {
        clearInterval(autoScrollRef.current.intervalId);
        autoScrollRef.current.intervalId = null;
      }
      return;
    }

    const container = scrollContainerRef.current;
    const scrollSpeed = 1;
    const scrollDelay = 30;
    const pauseAtEnds = 2000;
    const threshold = 2;

    const startAutoScroll = () => {
      if (autoScrollRef.current.intervalId) {
        clearInterval(autoScrollRef.current.intervalId);
      }

      autoScrollRef.current.intervalId = setInterval(() => {
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const maxScrollTop = scrollHeight - clientHeight;
        const isAtBottom = scrollTop >= maxScrollTop - threshold;
        const isAtTop = scrollTop <= threshold;

        if (isAtBottom && autoScrollRef.current.direction === 'down') {
          clearInterval(autoScrollRef.current.intervalId!);
          autoScrollRef.current.intervalId = null;
          autoScrollRef.current.direction = 'up';
          container.scrollTop = maxScrollTop;
          setTimeout(() => startAutoScroll(), pauseAtEnds);
        } else if (isAtTop && autoScrollRef.current.direction === 'up') {
          clearInterval(autoScrollRef.current.intervalId!);
          autoScrollRef.current.intervalId = null;
          autoScrollRef.current.direction = 'down';
          container.scrollTop = 0;
          setTimeout(() => startAutoScroll(), pauseAtEnds);
        } else {
          if (autoScrollRef.current.direction === 'down') {
            const newScrollTop = Math.min(container.scrollTop + scrollSpeed, maxScrollTop);
            container.scrollTop = newScrollTop;
            if (newScrollTop >= maxScrollTop - threshold) {
              clearInterval(autoScrollRef.current.intervalId!);
              autoScrollRef.current.intervalId = null;
              autoScrollRef.current.direction = 'up';
              setTimeout(() => startAutoScroll(), pauseAtEnds);
            }
          } else {
            const newScrollTop = Math.max(container.scrollTop - scrollSpeed, 0);
            container.scrollTop = newScrollTop;
            if (newScrollTop <= threshold) {
              clearInterval(autoScrollRef.current.intervalId!);
              autoScrollRef.current.intervalId = null;
              autoScrollRef.current.direction = 'down';
              setTimeout(() => startAutoScroll(), pauseAtEnds);
            }
          }
        }
      }, scrollDelay);
    };

    startAutoScroll();

    return () => {
      if (autoScrollRef.current.intervalId) {
        clearInterval(autoScrollRef.current.intervalId);
        autoScrollRef.current.intervalId = null;
      }
    };
  }, [forecasts.length]);

  if (forecasts.length === 0) {
    return (
      <Card className="mb-0 bg-[#2A2A2A]/50 border border-[#3A3A3A] flex flex-col" style={{ height: totalCardHeight, minHeight: totalCardHeight, maxHeight: totalCardHeight }}>
        <CardHeader className="flex-shrink-0" style={{ padding: 'clamp(0.6325rem, 1.2144vw, 0.759rem)', paddingBottom: titleBottomMargin, paddingLeft: tablePaddingLeft, display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
          <CardTitle className="text-white" style={{ fontSize: 'clamp(1.012rem, 2.2264vw, 1.265rem)', paddingLeft: '0', margin: '0' }}>
            Forecast do Dia - {vendedorNome}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center p-0" style={{ height: fixedHeightFor4Rows, minHeight: fixedHeightFor4Rows, maxHeight: fixedHeightFor4Rows }}>
          <div style={{ paddingLeft: tablePaddingLeft, paddingRight: 'clamp(0.6325rem, 1.2144vw, 0.759rem)', width: '100%' }}>
            <p className="text-[#CCCCCC] text-center" style={{ fontSize: 'clamp(0.8855rem, 1.6192vw, 1.012rem)' }}>
              Nenhum forecast cadastrado para hoje.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCountdown = (min: number, seg: number) =>
    `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;

  const temBanner = !!alerta;

  return (
    <div className="flex flex-col w-full">
      {temBanner && alerta && (
        <div
          role="alert"
          className="w-full min-w-0 flex items-center justify-center gap-2 py-1.5 px-2 flex-shrink-0 rounded-t-lg"
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            borderBottom: '2px solid #fef08a',
            animation: 'alert-hora-proxima 0.8s ease-in-out infinite',
          }}
        >
          <span className="text-[#fef08a] font-bold text-sm uppercase tracking-wide">
            Negociação se aproxima
          </span>
          <span className="text-white font-semibold truncate max-w-[70%]">
            {alerta.forecast.clienteNome}
          </span>
          <span className="text-[#fef08a] font-mono font-bold tabular-nums">
            {formatCountdown(alerta.countdown.minutos, alerta.countdown.segundos)}
          </span>
        </div>
      )}
      <Card className="mb-0 bg-[#2A2A2A]/50 border border-[#3A3A3A] flex flex-col flex-shrink-0" style={{ height: totalCardHeight, minHeight: totalCardHeight, maxHeight: totalCardHeight }}>
      <CardHeader className="flex-shrink-0" style={{ padding: 'clamp(0.6325rem, 1.2144vw, 0.759rem)', paddingBottom: titleBottomMargin, paddingLeft: tablePaddingLeft, display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
        <CardTitle className="text-white" style={{ fontSize: 'clamp(1.012rem, 2.2264vw, 1.265rem)', paddingLeft: '0', margin: '0', marginLeft: 'clamp(1rem, 2vw, 1.8rem)' }}>
          Forecast do Dia - {vendedorNome}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0" style={{ height: fixedHeightFor4Rows, minHeight: fixedHeightFor4Rows, maxHeight: fixedHeightFor4Rows }}>
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide" 
          style={{ 
            maxWidth: '100%', 
            width: '100%',
            height: fixedHeightFor4Rows,
            minHeight: fixedHeightFor4Rows,
            maxHeight: fixedHeightFor4Rows,
            paddingLeft: tablePaddingLeft,
            paddingRight: 'clamp(0.6325rem, 1.2144vw, 0.759rem)',
            paddingTop: '0',
            paddingBottom: 'clamp(0.6325rem, 1.2144vw, 0.759rem)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', minHeight: 'auto' }}>
            <table className="w-full border-collapse" style={{ minWidth: 'min(441.6px, 100%)' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 30 }}>
              <tr className="border-b border-[#3A3A3A]" style={{ backgroundColor: '#1A1A1A' }}>
                <th className="text-center text-[#CCCCCC] whitespace-nowrap" style={{ backgroundColor: '#1A1A1A', fontSize: 'clamp(0.759rem, 1.518vw, 0.8855rem)', paddingTop: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingBottom: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                  Nome
                </th>
                <th className="text-center text-[#CCCCCC] whitespace-nowrap" style={{ backgroundColor: '#1A1A1A', fontSize: 'clamp(0.759rem, 1.518vw, 0.8855rem)', paddingTop: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingBottom: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                  Hora
                </th>
                <th className="text-center text-[#CCCCCC] whitespace-nowrap" style={{ backgroundColor: '#1A1A1A', fontSize: 'clamp(0.759rem, 1.518vw, 0.8855rem)', paddingTop: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingBottom: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                  Valor
                </th>
                <th className="text-center text-[#CCCCCC] hidden md:table-cell" style={{ backgroundColor: '#1A1A1A', fontSize: 'clamp(0.6325rem, 1.2144vw, 0.82225rem)', paddingTop: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingBottom: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingLeft: 'clamp(0.3795rem, 0.759vw, 0.56925rem)', paddingRight: 'clamp(0.506rem, 1.012vw, 0.759rem)' }}>
                  Observações
                </th>
                <th className="text-center text-[#CCCCCC] hidden lg:table-cell whitespace-nowrap" style={{ backgroundColor: '#1A1A1A', fontSize: 'clamp(0.6325rem, 1.2144vw, 0.82225rem)', paddingTop: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingBottom: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingLeft: 'clamp(0.3795rem, 0.759vw, 0.56925rem)', paddingRight: 'clamp(0.506rem, 1.012vw, 0.759rem)' }}>
                  Primeira Call
                </th>
              </tr>
            </thead>
            <tbody>
              {forecastsOrdenados.map((forecast) => (
                <tr key={forecast.id} className="border-b border-[#3A3A3A]/50 hover:bg-[#3A3A3A]/30">
                  <td className="text-center text-white whitespace-nowrap" style={{ fontSize: 'clamp(0.8855rem, 1.8216vw, 1.012rem)', paddingTop: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingBottom: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{forecast.clienteNome}</span>
                      {forecast.classificacao && getEmojiClassificacao(forecast.classificacao) && (
                        <span style={{ fontSize: 'clamp(1rem, 1.5vw, 1.125rem)', lineHeight: '1' }} title={`Classificação: ${forecast.classificacao}`}>
                          {getEmojiClassificacao(forecast.classificacao)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center text-[#CCCCCC] whitespace-nowrap" style={{ fontSize: 'clamp(0.8855rem, 1.8216vw, 1.012rem)', paddingTop: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingBottom: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                    {forecast.horario || '-'}
                  </td>
                  <td className="text-center text-white font-semibold whitespace-nowrap" style={{ fontSize: 'clamp(0.8855rem, 1.8216vw, 1.012rem)', paddingTop: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingBottom: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                    {forecast.valor > 0 ? formatCurrency(forecast.valor) : '-'}
                  </td>
                  <td className="text-center text-[#CCCCCC] whitespace-nowrap hidden md:table-cell" style={{ fontSize: 'clamp(0.8855rem, 1.8216vw, 1.012rem)', paddingTop: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingBottom: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }} title={forecast.observacoes}>
                    {forecast.observacoes || '-'}
                  </td>
                  <td className="text-center text-[#CCCCCC] whitespace-nowrap hidden lg:table-cell" style={{ fontSize: 'clamp(0.8855rem, 1.8216vw, 1.012rem)', paddingTop: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingBottom: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                    {forecast.primeiraCall ? formatDate(forecast.primeiraCall) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
