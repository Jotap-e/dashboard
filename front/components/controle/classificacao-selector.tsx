'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClassificacaoForecast } from '@/lib/types/forecast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClassificacaoSelectorProps {
  negociacaoId: string;
  clienteNome: string;
  classificacaoAtual?: ClassificacaoForecast;
  onSelect: (classificacao: ClassificacaoForecast) => void;
  onCancel: () => void;
}

// Componente de emoji animado
const EmojiAnimado = ({ tipo }: { tipo: ClassificacaoForecast }) => {
  switch (tipo) {
    case 'quente':
      return (
        <span className="inline-block animate-hot-face" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
          🥵
        </span>
      );
    case 'morno':
      return (
        <span className="inline-block animate-neutral-face" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
          😐
        </span>
      );
    case 'frio':
      return (
        <span className="inline-block animate-cold-face" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
          🥶
        </span>
      );
  }
};

const classificacoes: Array<{
  valor: ClassificacaoForecast;
  label: string;
  cor: string;
  corHover: string;
  corBorda: string;
}> = [
  {
    valor: 'quente',
    label: 'Quente',
    cor: 'bg-red-600',
    corHover: 'hover:bg-red-700',
    corBorda: 'border-red-500',
  },
  {
    valor: 'morno',
    label: 'Morno',
    cor: 'bg-yellow-600',
    corHover: 'hover:bg-yellow-700',
    corBorda: 'border-yellow-500',
  },
  {
    valor: 'frio',
    label: 'Frio',
    cor: 'bg-blue-600',
    corHover: 'hover:bg-blue-700',
    corBorda: 'border-blue-500',
  },
];

export function ClassificacaoSelector({
  negociacaoId,
  clienteNome,
  classificacaoAtual,
  onSelect,
  onCancel,
}: ClassificacaoSelectorProps) {
  return (
    <Card className="mb-4 bg-[#2A2A2A]/50 border border-[#3A3A3A]">
      <CardHeader style={{ padding: 'clamp(0.625rem, 1vw, 0.875rem)' }}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.125rem)' }}>
            Classificar Forecast - {clienteNome}
          </CardTitle>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="text-[#CCCCCC] hover:text-white hover:bg-[#3A3A3A]"
          >
            <X style={{ width: 'clamp(1rem, 1.5vw, 1.25rem)', height: 'clamp(1rem, 1.5vw, 1.25rem)' }} />
          </Button>
        </div>
      </CardHeader>
      <CardContent style={{ padding: 'clamp(0.625rem, 1vw, 0.875rem)' }}>
        <p className="text-[#CCCCCC] mb-4 text-center" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
          Selecione a classificação do forecast:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {classificacoes.map((classificacao) => {
            const isSelected = classificacaoAtual === classificacao.valor;
            return (
              <Button
                key={classificacao.valor}
                onClick={() => onSelect(classificacao.valor)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 py-4 px-4 text-white transition-all',
                  isSelected
                    ? `${classificacao.cor} ${classificacao.corBorda} border-2 shadow-lg`
                    : `${classificacao.cor} ${classificacao.corHover}`
                )}
                style={{
                  fontSize: 'clamp(0.875rem, 1.8vw, 1rem)',
                  minHeight: 'clamp(5rem, 8vw, 6rem)',
                }}
              >
                <EmojiAnimado tipo={classificacao.valor} />
                <span className="font-semibold">{classificacao.label}</span>
                {isSelected && (
                  <span className="text-xs opacity-80 mt-1">✓ Selecionado</span>
                )}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
