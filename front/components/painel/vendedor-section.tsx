'use client';

import { NegociacoesPorVendedor } from '@/lib/types/negociacoes';
import { NegociacaoCard } from './negociacao-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AutoScrollContainer } from './auto-scroll-container';
import { User } from 'lucide-react';

interface VendedorSectionProps {
  dados: NegociacoesPorVendedor;
}

export function VendedorSection({ dados }: VendedorSectionProps) {
  return (
    <div className="w-full">
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="text-[#fed094]" style={{ width: 'clamp(1rem, 1.5vw, 1.25rem)', height: 'clamp(1rem, 1.5vw, 1.25rem)' }} />
            <CardTitle className="text-white" style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}>
              {dados.vendedor}
            </CardTitle>
            <span className="text-[#CCCCCC] ml-auto" style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)' }}>
              {dados.negociacoes.length} {dados.negociacoes.length === 1 ? 'negociação' : 'negociações'}
            </span>
          </div>
        </CardHeader>
      </Card>

      <div className="w-full" style={{ maxHeight: 'clamp(400px, 50vh, 600px)' }}>
        <AutoScrollContainer speed={30} pauseOnInteraction={true}>
          {dados.negociacoes.map((negociacao) => (
            <div 
              key={negociacao.id} 
              style={{ 
                minWidth: 'clamp(280px, 25vw, 320px)', 
                maxWidth: 'clamp(280px, 25vw, 320px)', 
                width: 'clamp(280px, 25vw, 320px)',
                height: 'clamp(200px, 30vh, 280px)',
                flexShrink: 0 
              }}
            >
              <NegociacaoCard negociacao={negociacao} />
            </div>
          ))}
        </AutoScrollContainer>
      </div>
    </div>
  );
}
