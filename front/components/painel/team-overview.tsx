'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, TrendingUp, Users, Phone } from 'lucide-react';

interface TeamOverviewProps {
  metaTotal: number;
  valorAcumuladoTotal: number;
  vendedoresCount: number;
  totalReunioes?: number;
}

export function TeamOverview({ metaTotal, valorAcumuladoTotal, vendedoresCount, totalReunioes = 0 }: TeamOverviewProps) {
  // Quando meta não está definida (0) mas há valor acumulado, mostrar 100% para não zerar a barra
  const percentual = metaTotal > 0
    ? (valorAcumuladoTotal / metaTotal) * 100
    : valorAcumuladoTotal > 0
      ? 100
      : 0;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="mb-2 bg-[#2A2A2A]/50 border border-[#fed094]/30">
      <CardHeader style={{ padding: 'clamp(0.75rem, 1.2vw, 1rem)' }}>
        <CardTitle className="flex items-center gap-1.5 md:gap-2 text-white" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
          <Users className="text-[#fed094] flex-shrink-0" style={{ width: 'clamp(1.25rem, 2.5vw, 1.75rem)', height: 'clamp(1.25rem, 2.5vw, 1.75rem)' }} />
          Acompanhamento do Time
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: 'clamp(0.75rem, 1.2vw, 1rem)', paddingTop: 0 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
          {/* Meta Total - alinhado ao início (mobile: start, md: start) */}
          <div className="flex flex-col items-start text-left">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
              <Target className="text-[#fed094] flex-shrink-0" style={{ width: 'clamp(1rem, 2vw, 1.25rem)', height: 'clamp(1rem, 2vw, 1.25rem)' }} />
              <span className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.9375rem)' }}>
                Meta Total
              </span>
            </div>
            <span className="text-white font-bold truncate" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.75rem)' }}>
              {formatCurrency(metaTotal)}
            </span>
          </div>

          {/* Valor Acumulado Total - alinhado ao centro em md+, start em mobile */}
          <div className="flex flex-col items-start md:items-center md:text-center">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
              <TrendingUp className="text-[#3b82f6] flex-shrink-0" style={{ width: 'clamp(1rem, 2vw, 1.25rem)', height: 'clamp(1rem, 2vw, 1.25rem)' }} />
              <span className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.9375rem)' }}>
                Valor Acumulado
              </span>
            </div>
            <span className="text-white font-bold truncate" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.75rem)' }}>
              {formatCurrency(valorAcumuladoTotal)}
            </span>
          </div>

          {/* Atingimento - alinhado ao fim em md+, start em mobile */}
          <div className="flex flex-col items-start md:items-end md:text-right">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
              <span className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.9375rem)' }}>
                Atingimento
              </span>
            </div>
            <span 
              className="font-bold" 
              style={{ 
                fontSize: 'clamp(1rem, 2.5vw, 1.75rem)',
                color: percentual >= 100 ? '#22c55e' : percentual >= 80 ? '#f59e0b' : '#ef4444'
              }}
            >
              {percentual.toFixed(1)}%
            </span>
          </div>

          {/* Total de Reuniões */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
              <Phone className="text-[#22c55e] flex-shrink-0" style={{ width: 'clamp(1rem, 2vw, 1.25rem)', height: 'clamp(1rem, 2vw, 1.25rem)' }} />
              <span className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.9375rem)' }}>
                Reuniões
              </span>
            </div>
            <span className="text-white font-bold truncate" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.75rem)' }}>
              {totalReunioes}
            </span>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-3 md:mt-4">
          <div className="w-full bg-[#1A1A1A] rounded-full" style={{ height: 'clamp(0.5rem, 1vw, 0.875rem)' }}>
            <div
              className="bg-[#fed094] rounded-full transition-all duration-300"
              style={{
                height: '100%',
                width: `${Math.min(percentual, 100)}%`,
              }}
            />
          </div>
          <div className="flex flex-wrap justify-between items-center gap-2 mt-1.5 md:mt-2">
            <span className="text-[#CCCCCC] truncate min-w-0" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
              {vendedoresCount} vendedor{vendedoresCount !== 1 ? 'es' : ''}
            </span>
            <span className="text-[#CCCCCC] truncate min-w-0" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
              {formatCurrency(Math.max(0, metaTotal - valorAcumuladoTotal))} restante
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
