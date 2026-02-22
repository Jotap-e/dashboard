'use client';

import { TipoBloco } from '@/lib/types/negociacoes';
import { TrendingUp, Users, Target } from 'lucide-react';

interface BlocoLabelProps {
  tipo: TipoBloco;
}

const tipoConfig: Record<TipoBloco, { label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }> = {
  forecast: {
    label: 'Forecast',
    icon: TrendingUp,
    color: '#3b82f6',
  },
  closer: {
    label: 'Closer',
    icon: Target,
    color: '#22c55e',
  },
  sdr: {
    label: 'SDR',
    icon: Users,
    color: '#f59e0b',
  },
};

export function BlocoLabel({ tipo }: BlocoLabelProps) {
  const config = tipoConfig[tipo];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 mb-1 flex-shrink-0">
      <Icon 
        style={{ 
          width: 'clamp(0.875rem, 1.2vw, 1rem)', 
          height: 'clamp(0.875rem, 1.2vw, 1rem)',
          color: config.color 
        }} 
      />
      <span 
        className="font-semibold" 
        style={{ 
          fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)',
          color: config.color,
        }}
      >
        {config.label}
      </span>
    </div>
  );
}
