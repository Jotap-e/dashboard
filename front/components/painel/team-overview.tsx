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
      <CardHeader style={{ padding: 'clamp(0.69rem, 1.38vw, 0.92rem)' }}>
        <CardTitle className="flex items-center gap-2 md:gap-3 text-white" style={{ fontSize: 'clamp(1.035rem, 2.3vw, 1.38rem)' }}>
          <Users className="text-[#fed094] flex-shrink-0" style={{ width: 'clamp(1.38rem, 2.76vw, 1.84rem)', height: 'clamp(1.38rem, 2.76vw, 1.84rem)' }} />
          Acompanhamento do Time
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: 'clamp(0.69rem, 1.38vw, 0.92rem)', paddingTop: 0 }}>
        <div className="flex flex-row justify-between items-start gap-3 md:gap-4 mb-3 md:mb-4">
          {/* Meta Total */}
          <div className="flex flex-col items-start text-left flex-1">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-1">
              <Target className="text-[#fed094] flex-shrink-0" style={{ width: 'clamp(1.104rem, 2.208vw, 1.38rem)', height: 'clamp(1.104rem, 2.208vw, 1.38rem)' }} />
              <span className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.828rem, 1.9872vw, 1.035rem)' }}>
                Meta Total
              </span>
            </div>
            <span className="text-white font-bold truncate" style={{ fontSize: 'clamp(1.104rem, 2.76vw, 1.932rem)' }}>
              {formatCurrency(metaTotal)}
            </span>
          </div>

          {/* Valor Acumulado Total */}
          <div className="flex flex-col items-center text-center flex-1">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-1">
              <TrendingUp className="text-[#3b82f6] flex-shrink-0" style={{ width: 'clamp(1.104rem, 2.208vw, 1.38rem)', height: 'clamp(1.104rem, 2.208vw, 1.38rem)' }} />
              <span className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.828rem, 1.9872vw, 1.035rem)' }}>
                Valor Acumulado
              </span>
            </div>
            <span className="text-white font-bold truncate" style={{ fontSize: 'clamp(1.104rem, 2.76vw, 1.932rem)' }}>
              {formatCurrency(valorAcumuladoTotal)}
            </span>
          </div>

          {/* Total de Reuniões */}
          <div className="flex flex-col items-end text-right flex-1">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-1">
              <Phone className="text-[#22c55e] flex-shrink-0" style={{ width: 'clamp(1.104rem, 2.208vw, 1.38rem)', height: 'clamp(1.104rem, 2.208vw, 1.38rem)' }} />
              <span className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.828rem, 1.9872vw, 1.035rem)' }}>
                Reuniões
              </span>
            </div>
            <span className="text-white font-bold truncate" style={{ fontSize: 'clamp(1.104rem, 2.76vw, 1.932rem)' }}>
              {totalReunioes}
            </span>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-3 md:mt-4">
          <div className="w-full bg-[#1A1A1A] rounded-full" style={{ height: 'clamp(0.575rem, 1.104vw, 0.805rem)' }}>
            <div
              className="bg-[#fed094] rounded-full transition-all duration-300"
              style={{
                height: '100%',
                width: `${Math.min(percentual, 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-end items-center mt-1.5 md:mt-2">
            <span className="text-[#CCCCCC] truncate min-w-0" style={{ fontSize: 'clamp(0.94875rem, 2.07vw, 1.12125rem)' }}>
              {formatCurrency(Math.max(0, metaTotal - valorAcumuladoTotal))} restante
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
