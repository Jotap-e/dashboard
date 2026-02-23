'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, Phone } from 'lucide-react';

interface VendedorMetaCardProps {
  vendedorNome: string;
  meta: number;
  valorAcumulado: number;
  reunioes?: number;
}

export function VendedorMetaCard({ vendedorNome, meta, valorAcumulado, reunioes = 0 }: VendedorMetaCardProps) {
  const percentual = meta > 0 ? (valorAcumulado / meta) * 100 : 0;
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="bg-[#2A2A2A]/50 border border-[#3A3A3A]">
      <CardContent style={{ padding: 'clamp(0.625rem, 1vw, 0.875rem)' }}>
        <div className="space-y-1.5 md:space-y-2">
          {/* Meta */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Target className="text-[#fed094] flex-shrink-0" style={{ width: 'clamp(0.875rem, 1.8vw, 1.125rem)', height: 'clamp(0.875rem, 1.8vw, 1.125rem)' }} />
              <span className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                Meta:
              </span>
            </div>
            <span className="text-white font-semibold truncate text-left" style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}>
              {formatCurrency(meta)}
            </span>
          </div>

          {/* Valor Acumulado */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 md:gap-2">
              <TrendingUp className="text-[#3b82f6] flex-shrink-0" style={{ width: 'clamp(0.875rem, 1.8vw, 1.125rem)', height: 'clamp(0.875rem, 1.8vw, 1.125rem)' }} />
              <span className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                Acumulado:
              </span>
            </div>
            <span className="text-white font-semibold truncate text-left" style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}>
              {formatCurrency(valorAcumulado)}
            </span>
          </div>

          {/* Reuniões */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Phone className="text-[#22c55e] flex-shrink-0" style={{ width: 'clamp(0.875rem, 1.8vw, 1.125rem)', height: 'clamp(0.875rem, 1.8vw, 1.125rem)' }} />
              <span className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                Reuniões:
              </span>
            </div>
            <span className="text-white font-semibold truncate text-left" style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}>
              {reunioes}
            </span>
          </div>

          {/* Barra de progresso */}
          {meta > 0 && (
            <div className="mt-1.5 md:mt-2">
              <div className="w-full bg-[#1A1A1A] rounded-full" style={{ height: 'clamp(0.375rem, 0.8vw, 0.625rem)' }}>
                <div
                  className="bg-[#fed094] rounded-full transition-all duration-300"
                  style={{
                    height: '100%',
                    width: `${Math.min(percentual, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-0.5 md:mt-1 gap-2">
                <span className="text-[#CCCCCC] truncate" style={{ fontSize: 'clamp(0.5625rem, 1.2vw, 0.6875rem)' }}>
                  {percentual.toFixed(1)}%
                </span>
                <span className="text-[#CCCCCC] truncate" style={{ fontSize: 'clamp(0.5625rem, 1.2vw, 0.6875rem)' }}>
                  {formatCurrency(Math.max(0, meta - valorAcumulado))} restante
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
