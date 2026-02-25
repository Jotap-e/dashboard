'use client';

import { Forecast } from '@/lib/types/forecast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone } from 'lucide-react';
import { useEffect, useRef } from 'react';

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
}

export function ForecastTable({ forecasts, vendedorNome }: ForecastTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<{ direction: 'down' | 'up'; intervalId: NodeJS.Timeout | null }>({ direction: 'down', intervalId: null });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
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

  // Scroll automático quando há 4 ou mais forecasts
  useEffect(() => {
    if (forecasts.length < 4 || !scrollContainerRef.current) {
      // Limpar intervalo se existir
      if (autoScrollRef.current.intervalId) {
        clearInterval(autoScrollRef.current.intervalId);
        autoScrollRef.current.intervalId = null;
      }
      return;
    }

    const container = scrollContainerRef.current;
    const scrollSpeed = 1; // pixels por frame
    const scrollDelay = 30; // ms entre frames
    const pauseAtEnds = 2000; // ms para pausar nas extremidades
    const threshold = 2; // margem de erro para detecção de extremidades

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
          // Quando atingir o scroll máximo para baixo, mudar direção para cima imediatamente
          clearInterval(autoScrollRef.current.intervalId!);
          autoScrollRef.current.intervalId = null;
          autoScrollRef.current.direction = 'up';
          
          // Garantir que está realmente no máximo
          container.scrollTop = maxScrollTop;
          
          setTimeout(() => {
            startAutoScroll();
          }, pauseAtEnds);
        } else if (isAtTop && autoScrollRef.current.direction === 'up') {
          // Quando atingir o topo, mudar direção para baixo
          clearInterval(autoScrollRef.current.intervalId!);
          autoScrollRef.current.intervalId = null;
          autoScrollRef.current.direction = 'down';
          
          // Garantir que está realmente no topo
          container.scrollTop = 0;
          
          setTimeout(() => {
            startAutoScroll();
          }, pauseAtEnds);
        } else {
          // Continuar scrollando
          if (autoScrollRef.current.direction === 'down') {
            const newScrollTop = Math.min(container.scrollTop + scrollSpeed, maxScrollTop);
            container.scrollTop = newScrollTop;
            
            // Verificar novamente se atingiu o máximo após o scroll
            if (newScrollTop >= maxScrollTop - threshold) {
              clearInterval(autoScrollRef.current.intervalId!);
              autoScrollRef.current.intervalId = null;
              autoScrollRef.current.direction = 'up';
              
              setTimeout(() => {
                startAutoScroll();
              }, pauseAtEnds);
            }
          } else {
            const newScrollTop = Math.max(container.scrollTop - scrollSpeed, 0);
            container.scrollTop = newScrollTop;
            
            // Verificar novamente se atingiu o topo após o scroll
            if (newScrollTop <= threshold) {
              clearInterval(autoScrollRef.current.intervalId!);
              autoScrollRef.current.intervalId = null;
              autoScrollRef.current.direction = 'down';
              
              setTimeout(() => {
                startAutoScroll();
              }, pauseAtEnds);
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

  return (
    <Card className="mb-0 bg-[#2A2A2A]/50 border border-[#3A3A3A] flex flex-col" style={{ height: totalCardHeight, minHeight: totalCardHeight, maxHeight: totalCardHeight }}>
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
                <th className="text-left text-[#CCCCCC] whitespace-nowrap" style={{ backgroundColor: '#1A1A1A', fontSize: 'clamp(0.759rem, 1.518vw, 0.8855rem)', paddingTop: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingBottom: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                  Nome
                </th>
                <th className="text-left text-[#CCCCCC] whitespace-nowrap" style={{ backgroundColor: '#1A1A1A', fontSize: 'clamp(0.759rem, 1.518vw, 0.8855rem)', paddingTop: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingBottom: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                  Número
                </th>
                <th className="text-left text-[#CCCCCC] whitespace-nowrap" style={{ backgroundColor: '#1A1A1A', fontSize: 'clamp(0.759rem, 1.518vw, 0.8855rem)', paddingTop: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingBottom: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                  Data
                </th>
                <th className="text-left text-[#CCCCCC] whitespace-nowrap" style={{ backgroundColor: '#1A1A1A', fontSize: 'clamp(0.759rem, 1.518vw, 0.8855rem)', paddingTop: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingBottom: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                  Horário
                </th>
                <th className="text-left text-[#CCCCCC] whitespace-nowrap" style={{ backgroundColor: '#1A1A1A', fontSize: 'clamp(0.759rem, 1.518vw, 0.8855rem)', paddingTop: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingBottom: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                  Valor
                </th>
                <th className="text-left text-[#CCCCCC] hidden md:table-cell" style={{ backgroundColor: '#1A1A1A', fontSize: 'clamp(0.6325rem, 1.2144vw, 0.82225rem)', paddingTop: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingBottom: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingLeft: 'clamp(0.3795rem, 0.759vw, 0.56925rem)', paddingRight: 'clamp(0.506rem, 1.012vw, 0.759rem)' }}>
                  Observações
                </th>
                <th className="text-left text-[#CCCCCC] hidden lg:table-cell whitespace-nowrap" style={{ backgroundColor: '#1A1A1A', fontSize: 'clamp(0.6325rem, 1.2144vw, 0.82225rem)', paddingTop: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingBottom: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingLeft: 'clamp(0.3795rem, 0.759vw, 0.56925rem)', paddingRight: 'clamp(0.506rem, 1.012vw, 0.759rem)' }}>
                  Primeira Call
                </th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map((forecast) => (
                <tr key={forecast.id} className="border-b border-[#3A3A3A]/50 hover:bg-[#3A3A3A]/30">
                  <td className="text-white whitespace-nowrap" style={{ fontSize: 'clamp(0.8855rem, 1.8216vw, 1.012rem)', paddingTop: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingBottom: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                    {forecast.clienteNome}
                  </td>
                  <td className="text-[#CCCCCC] whitespace-nowrap" style={{ fontSize: 'clamp(0.8855rem, 1.8216vw, 1.012rem)', paddingTop: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingBottom: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                    {forecast.clienteNumero ? (
                      <div className="flex items-center" style={{ gap: 'clamp(0.3795rem, 0.759vw, 0.56925rem)' }}>
                        <Phone className="flex-shrink-0 text-white hidden sm:block" style={{ width: 'clamp(0.759rem, 1.2144vw, 0.8855rem)', height: 'clamp(0.759rem, 1.2144vw, 0.8855rem)' }} />
                        <span className="whitespace-nowrap">{forecast.clienteNumero}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="text-[#CCCCCC] whitespace-nowrap" style={{ fontSize: 'clamp(0.8855rem, 1.8216vw, 1.012rem)', paddingTop: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingBottom: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                    {formatDate(forecast.data)}
                  </td>
                  <td className="text-[#CCCCCC] whitespace-nowrap" style={{ fontSize: 'clamp(0.8855rem, 1.8216vw, 1.012rem)', paddingTop: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingBottom: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                    {forecast.horario}
                  </td>
                  <td className="text-white font-semibold whitespace-nowrap" style={{ fontSize: 'clamp(0.8855rem, 1.8216vw, 1.012rem)', paddingTop: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingBottom: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
                    {forecast.valor > 0 ? formatCurrency(forecast.valor) : '-'}
                  </td>
                  <td className="text-[#CCCCCC] whitespace-nowrap hidden md:table-cell" style={{ fontSize: 'clamp(0.8855rem, 1.8216vw, 1.012rem)', paddingTop: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingBottom: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }} title={forecast.observacoes}>
                    {forecast.observacoes || '-'}
                  </td>
                  <td className="text-[#CCCCCC] whitespace-nowrap hidden lg:table-cell" style={{ fontSize: 'clamp(0.8855rem, 1.8216vw, 1.012rem)', paddingTop: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingBottom: 'clamp(1.455rem, 2.911vw, 1.747rem)', paddingLeft: 'clamp(0.506rem, 1.012vw, 0.759rem)', paddingRight: 'clamp(0.759rem, 1.518vw, 1.1385rem)' }}>
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
  );
}
