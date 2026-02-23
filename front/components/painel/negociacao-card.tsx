'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Negociacao } from '@/lib/types/negociacoes';
import { cn } from '@/lib/utils';
import { DollarSign, Phone } from 'lucide-react';

interface NegociacaoCardProps {
  negociacao: Negociacao;
}

const statusConfig: Record<Negociacao['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; color: string }> = {
  indicacao: { label: 'Indicação', variant: 'default', color: '#3b82f6' },
  conectado: { label: 'Conectado', variant: 'outline', color: '#f59e0b' },
  agendado: { label: 'Agendado', variant: 'warning', color: '#f59e0b' },
  agendado_sdr: { label: 'Agendado SDR', variant: 'warning', color: '#f59e0b' },
  reuniao: { label: 'Reunião', variant: 'default', color: '#3b82f6' },
  negociacao: { label: 'Negociação', variant: 'default', color: '#3b82f6' },
  ganho: { label: 'Ganho', variant: 'success', color: '#22c55e' },
};

export function NegociacaoCard({ negociacao }: NegociacaoCardProps) {
  const statusInfo = statusConfig[negociacao.status] || { label: negociacao.status, variant: 'default' as const, color: '#6b7280' };
  const isNow = negociacao.isNow === true;
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card 
      className={cn(
        "hover:border-[#fed094]/50 transition-colors cursor-grab active:cursor-grabbing select-none flex flex-col relative",
        isNow && "border-2 border-[#fed094] shadow-lg shadow-[#fed094]/30"
      )}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100%',
        ...(isNow ? {
          borderWidth: '3px',
          borderColor: '#fed094',
          boxShadow: '0 10px 25px -5px rgba(254, 208, 148, 0.3), 0 8px 10px -6px rgba(254, 208, 148, 0.2)',
          backgroundColor: '#1A1A1A',
        } : {})
      }}
    >
      <CardHeader className="flex-shrink-0 relative" style={{ padding: 'clamp(0.75rem, 1.2vw, 1rem)' }}>
        <div className="flex items-start gap-2">
          <CardTitle className="text-white line-clamp-2 flex-1" style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>
            {negociacao.cliente}
          </CardTitle>
          <Badge 
            variant={statusInfo.variant} 
            className="flex-shrink-0" 
            style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.6875rem)', padding: 'clamp(0.25rem, 0.5vw, 0.375rem) clamp(0.5rem, 0.8vw, 0.625rem)' }}
          >
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-start relative" style={{ padding: 'clamp(0.75rem, 1.2vw, 1rem)', paddingTop: 0 }}>
        <div className="space-y-2">
          {/* Número do Cliente */}
          {negociacao.numero && (
            <div className="flex items-center gap-1.5 md:gap-2">
              <Phone className="text-[#CCCCCC] flex-shrink-0" style={{ width: 'clamp(0.75rem, 1.5vw, 0.875rem)', height: 'clamp(0.75rem, 1.5vw, 0.875rem)' }} />
              <p className="text-[#CCCCCC] truncate" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.9375rem)' }}>
                {negociacao.numero}
              </p>
            </div>
          )}

          {/* Valor */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <DollarSign className="text-[#CCCCCC] flex-shrink-0" style={{ width: 'clamp(0.75rem, 1.5vw, 0.875rem)', height: 'clamp(0.75rem, 1.5vw, 0.875rem)' }} />
            <p className="text-white font-semibold truncate" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.9375rem)' }}>
              {negociacao.valor && negociacao.valor > 0 
                ? formatCurrency(negociacao.valor)
                : 'Valor não definido'}
            </p>
          </div>
        </div>

        {/* Indicador "In call" */}
        {isNow && (
          <div 
            className="absolute flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-md bg-green-500/20 border border-green-500/50"
            style={{
              bottom: 'clamp(0.375rem, 0.8vw, 0.625rem)',
              right: 'clamp(0.375rem, 0.8vw, 0.625rem)',
              animation: 'gentle-pulse 2s ease-in-out infinite',
            }}
          >
            <span 
              className="text-green-400 font-semibold"
              style={{ fontSize: 'clamp(0.5rem, 1vw, 0.6875rem)' }}
            >
              In call
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
