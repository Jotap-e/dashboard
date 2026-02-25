'use client';

import React, { memo } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { VendedorMetaCard } from './vendedor-meta-card';
import { ForecastTable } from './forecast-table';
import { Forecast } from '@/lib/types/forecast';
import { Negociacao } from '@/lib/types/negociacoes';
import { MetaDiaria } from '@/lib/types/metas';
import { Badge } from '@/components/ui/badge';
import { Phone, DollarSign, Check } from 'lucide-react';

export interface AlertaHoraProxima {
  forecast: Forecast;
  countdown: { minutos: number; segundos: number };
}

interface CloserCardProps {
  vendedor: string;
  ownerId: string;
  meta: MetaDiaria | null;
  valorAcumulado: number;
  reunioes: number;
  forecastsHoje: Forecast[];
  alerta: AlertaHoraProxima | null;
  items: Array<{ negociacao: Negociacao }>;
  statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; color: string }>;
  formatCurrency: (value: number) => string;
  style?: React.CSSProperties;
}

const CloserCardComponent = ({
  vendedor,
  ownerId,
  meta,
  valorAcumulado,
  reunioes,
  forecastsHoje,
  alerta,
  items,
  statusConfig,
  formatCurrency,
  style,
}: CloserCardProps) => {
  // Calcular altura fixa para acomodar:
  // - Header do vendedor: ~2.5rem
  // - Card de meta (se houver): ~4rem (máximo)
  // - Forecast table header: ~2.5rem
  // - Forecast table content (4 linhas): ~21rem (aumentado em 15%)
  // - Cards "now": ~4rem (espaço reservado)
  // - Gaps e padding: ~1rem
  // Total aproximado: ~35rem
  const fixedCardHeight = 'clamp(35rem, 37vw, 37rem)';
  
  // Padding esquerdo para alinhar com a tabela de forecast
  const cardPaddingLeft = 'clamp(0.6325rem, 1.2144vw, 0.759rem)';
  
  return (
    <div className="painel-closer-card flex flex-col h-full w-full" style={{ maxHeight: '100%', height: fixedCardHeight, minHeight: fixedCardHeight, paddingLeft: cardPaddingLeft, ...style }}>
      {/* Header do vendedor */}
      <Card className="mb-1 flex-shrink-0 bg-transparent border-none">
        <CardHeader style={{ padding: 'clamp(0.46552rem, 0.93104vw, 0.69828rem)' }}>
          <div className="flex items-center" style={{ gap: 'clamp(0.46552rem, 0.93104vw, 0.69828rem)' }}>
            <User className="text-[#fed094] flex-shrink-0" style={{ width: 'clamp(1.1638rem, 2.79312vw, 1.62932rem)', height: 'clamp(1.1638rem, 2.79312vw, 1.62932rem)' }} />
            <CardTitle className="text-white truncate" style={{ fontSize: 'clamp(1.04742rem, 2.79312vw, 1.39656rem)' }}>
              {vendedor}
            </CardTitle>
          </div>
        </CardHeader>
      </Card>

      {/* Card de Meta - renderizado apenas se houver meta */}
      {meta && (
        <div className="mb-1 flex-shrink-0">
          <VendedorMetaCard
            vendedorNome={vendedor}
            meta={meta.meta ?? 0}
            valorAcumulado={valorAcumulado}
            reunioes={reunioes}
          />
        </div>
      )}

      {/* Tabela de Forecast + Card Now - descem juntos quando o anúncio aparece */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="mb-1 flex-shrink-0" style={{ flexShrink: 0 }}>
          <ForecastTable forecasts={forecastsHoje} vendedorNome={vendedor} alerta={alerta} />
        </div>

        {/* Negociações "Now" - sempre renderizado para manter espaço reservado */}
        <div className="flex-shrink-0 overflow-y-auto scrollbar-hide mt-1" style={{ maxHeight: 'clamp(4rem, 5vw, 5rem)', minHeight: 'clamp(4rem, 5vw, 5rem)' }}>
        {items.length > 0 ? (
          items.map(({ negociacao }, index) => {
            const statusInfo = statusConfig[negociacao.status] || { label: negociacao.status, variant: 'default' as const, color: '#6b7280' };
            return (
              <div
                key={`closer-${vendedor}-${negociacao.id}`}
                className={`w-full rounded-lg border-2 border-[#fed094] bg-[#1A1A1A]/80 shadow-lg shadow-[#fed094]/20 flex items-center transition-all hover:bg-[#1A1A1A] ${index === 0 ? 'mt-0' : 'mt-1'}`}
                style={{
                  minHeight: 'clamp(55.8624px, 6.51728vh, 74.4832px)',
                  borderWidth: '2px',
                  gap: 'clamp(0.93104rem, 1.86208vw, 1.39656rem)',
                  paddingLeft: 'clamp(1.2696rem, 2.5392vw, 1.6928rem)',
                  paddingRight: 'clamp(1.2696rem, 2.5392vw, 1.6928rem)',
                  paddingTop: 'clamp(0.69828rem, 1.39656vw, 1.04742rem)',
                  paddingBottom: 'clamp(0.69828rem, 1.39656vw, 1.04742rem)',
                }}
              >
                <div
                  className="flex-shrink-0 flex items-center justify-center bg-[#fed094] text-[#1A1A1A] rounded-md"
                  style={{
                    animation: 'gentle-pulse 2s ease-in-out infinite',
                    paddingLeft: 'clamp(0.46552rem, 0.93104vw, 0.69828rem)',
                    paddingRight: 'clamp(0.46552rem, 0.93104vw, 0.69828rem)',
                    paddingTop: 'clamp(0.23276rem, 0.46552vw, 0.34914rem)',
                    paddingBottom: 'clamp(0.23276rem, 0.46552vw, 0.34914rem)',
                  }}
                >
                  <Check style={{ width: 'clamp(0.81466rem, 1.39656vw, 0.93104rem)', height: 'clamp(0.81466rem, 1.39656vw, 0.93104rem)', marginRight: 'clamp(0.23276rem, 0.46552vw, 0.34914rem)' }} />
                  <span className="font-bold" style={{ fontSize: 'clamp(0.5819rem, 1.117248vw, 0.69828rem)' }}>
                    In call
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate" style={{ fontSize: 'clamp(0.81466rem, 1.86208vw, 1.04742rem)' }}>
                    {negociacao.cliente}
                  </h3>
                </div>

                <div className="flex-shrink-0">
                  <Badge
                    variant={statusInfo.variant}
                    className="flex-shrink-0"
                    style={{ fontSize: 'clamp(0.5819rem, 1.117248vw, 0.69828rem)', padding: 'clamp(0.23276rem, 0.46552vw, 0.34914rem) clamp(0.46552rem, 0.744832vw, 0.5819rem)' }}
                  >
                    {statusInfo.label}
                  </Badge>
                </div>

                {negociacao.numero && (
                  <div className="hidden md:flex items-center flex-shrink-0" style={{ gap: 'clamp(0.34914rem, 0.69828vw, 0.52371rem)' }}>
                    <Phone className="text-[#CCCCCC]" style={{ width: 'clamp(0.81466rem, 1.39656vw, 0.93104rem)', height: 'clamp(0.81466rem, 1.39656vw, 0.93104rem)' }} />
                    <span className="text-[#CCCCCC] truncate" style={{ fontSize: 'clamp(0.69828rem, 1.39656vw, 0.81466rem)' }}>
                      {negociacao.numero}
                    </span>
                  </div>
                )}

                <div className="flex items-center flex-shrink-0" style={{ gap: 'clamp(0.3795rem, 0.759vw, 0.56925rem)' }}>
                  <DollarSign className="text-[#fed094]" style={{ width: 'clamp(0.8855rem, 1.518vw, 1.012rem)', height: 'clamp(0.8855rem, 1.518vw, 1.012rem)' }} />
                  <span className="text-white font-bold" style={{ fontSize: 'clamp(0.8855rem, 1.8216vw, 1.1385rem)' }}>
                    {negociacao.valor && negociacao.valor > 0 ? formatCurrency(negociacao.valor) : 'N/A'}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="w-full text-center py-2">
            <p className="text-[#CCCCCC] text-sm" style={{ fontSize: 'clamp(0.69828rem, 1.39656vw, 0.81466rem)' }}>
              Nenhuma negociação em andamento
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

// Comparação customizada para evitar re-renders desnecessários
const areEqual = (prevProps: CloserCardProps, nextProps: CloserCardProps) => {
  // Comparar cada propriedade individualmente
  if (prevProps.vendedor !== nextProps.vendedor) return false;
  if (prevProps.valorAcumulado !== nextProps.valorAcumulado) return false;
  if (prevProps.reunioes !== nextProps.reunioes) return false;
  
  // Comparar meta
  if (prevProps.meta?.meta !== nextProps.meta?.meta) return false;
  if (prevProps.meta?.valor_acumulado !== nextProps.meta?.valor_acumulado) return false;
  if (prevProps.meta?.qtd_reunioes !== nextProps.meta?.qtd_reunioes) return false;
  
  // Comparar forecasts (por ID e quantidade)
  if (prevProps.forecastsHoje.length !== nextProps.forecastsHoje.length) return false;
  const prevForecastIds = prevProps.forecastsHoje.map(f => f.id).sort().join(',');
  const nextForecastIds = nextProps.forecastsHoje.map(f => f.id).sort().join(',');
  if (prevForecastIds !== nextForecastIds) return false;
  
  // Comparar items (por ID e quantidade)
  if (prevProps.items.length !== nextProps.items.length) return false;
  const prevItemIds = prevProps.items.map(i => i.negociacao.id).sort().join(',');
  const nextItemIds = nextProps.items.map(i => i.negociacao.id).sort().join(',');
  if (prevItemIds !== nextItemIds) return false;

  // Comparar alerta (atualizado via WebSocket a cada 1s)
  const prevAlerta = prevProps.alerta;
  const nextAlerta = nextProps.alerta;
  if ((prevAlerta === null) !== (nextAlerta === null)) return false;
  if (prevAlerta && nextAlerta) {
    if (prevAlerta.forecast.id !== nextAlerta.forecast.id) return false;
    if (prevAlerta.countdown.minutos !== nextAlerta.countdown.minutos) return false;
    if (prevAlerta.countdown.segundos !== nextAlerta.countdown.segundos) return false;
  }
  
  return true;
};

export const CloserCard = memo(CloserCardComponent, areEqual);
