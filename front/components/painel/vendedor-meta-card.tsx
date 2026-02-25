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
      <CardContent style={{ padding: 'clamp(1.0055232rem, 1.60883712vw, 1.3406976rem)' }}>
        <div className="flex flex-col" style={{ gap: 'clamp(0.3351744rem, 0.6703488vw, 0.5027616rem)', marginTop: 'clamp(0.5rem, 1vw, 1rem)' }}>
          {/* Container horizontal para Meta, Acumulado e Reuniões */}
          <div className="flex flex-row justify-between items-start w-full" style={{ gap: 'clamp(0.3351744rem, 0.6703488vw, 0.5027616rem)' }}>
            {/* Meta */}
            <div className="flex flex-col flex-1" style={{ gap: 'clamp(0.1675872rem, 0.3351744vw, 0.2513808rem)' }}>
              <div className="flex items-center justify-center" style={{ gap: 'clamp(0.5027616rem, 1.0055232vw, 0.7541424rem)' }}>
                <Target className="text-[#fed094] flex-shrink-0" style={{ width: 'clamp(1.1731104rem, 2.41325568vw, 1.5082848rem)', height: 'clamp(1.1731104rem, 2.41325568vw, 1.5082848rem)' }} />
                <span className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.9217296rem, 2.0110464vw, 1.0893168rem)' }}>
                  Meta:
                </span>
              </div>
              <span className="text-white font-semibold truncate text-center" style={{ fontSize: 'clamp(1.0893168rem, 2.41325568vw, 1.256904rem)' }}>
                {formatCurrency(meta)}
              </span>
            </div>

            {/* Valor Acumulado */}
            <div className="flex flex-col flex-1" style={{ gap: 'clamp(0.1675872rem, 0.3351744vw, 0.2513808rem)' }}>
              <div className="flex items-center justify-center" style={{ gap: 'clamp(0.5027616rem, 1.0055232vw, 0.7541424rem)' }}>
                <TrendingUp className="text-[#3b82f6] flex-shrink-0" style={{ width: 'clamp(1.1731104rem, 2.41325568vw, 1.5082848rem)', height: 'clamp(1.1731104rem, 2.41325568vw, 1.5082848rem)' }} />
                <span className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.9217296rem, 2.0110464vw, 1.0893168rem)' }}>
                  Acumulado:
                </span>
              </div>
              <span className="text-white font-semibold truncate text-center" style={{ fontSize: 'clamp(1.0893168rem, 2.41325568vw, 1.256904rem)' }}>
                {formatCurrency(valorAcumulado)}
              </span>
            </div>

            {/* Reuniões */}
            <div className="flex flex-col flex-1" style={{ gap: 'clamp(0.1675872rem, 0.3351744vw, 0.2513808rem)' }}>
              <div className="flex items-center justify-center" style={{ gap: 'clamp(0.5027616rem, 1.0055232vw, 0.7541424rem)' }}>
                <Phone className="text-[#22c55e] flex-shrink-0" style={{ width: 'clamp(1.1731104rem, 2.41325568vw, 1.5082848rem)', height: 'clamp(1.1731104rem, 2.41325568vw, 1.5082848rem)' }} />
                <span className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.9217296rem, 2.0110464vw, 1.0893168rem)' }}>
                  Reuniões:
                </span>
              </div>
              <span className="text-white font-semibold truncate text-center" style={{ fontSize: 'clamp(1.0893168rem, 2.41325568vw, 1.256904rem)' }}>
                {reunioes}
              </span>
            </div>
          </div>

          {/* Barra de progresso */}
          {meta > 0 && (
            <div style={{ marginTop: 'clamp(0.6703488rem, 1.3406976vw, 1.0055232rem)' }}>
              <div className="w-full bg-[#1A1A1A] rounded-full" style={{ height: 'clamp(0.6703488rem, 1.3406976vw, 1.0055232rem)' }}>
                <div
                  className="bg-[#fed094] rounded-full transition-all duration-300"
                  style={{
                    height: '100%',
                    width: `${Math.min(percentual, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between" style={{ marginTop: 'clamp(0.1675872rem, 0.3351744vw, 0.2513808rem)', gap: 'clamp(0.6703488rem, 1.3406976vw, 1.0055232rem)' }}>
                <span className="text-[#CCCCCC] truncate" style={{ fontSize: 'clamp(0.7541424rem, 1.47476736vw, 0.9217296rem)' }}>
                  {percentual.toFixed(1)}%
                </span>
                <span className="text-[#CCCCCC] truncate" style={{ fontSize: 'clamp(0.7541424rem, 1.47476736vw, 0.9217296rem)' }}>
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
