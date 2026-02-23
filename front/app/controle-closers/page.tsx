'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BackgroundLogo } from '@/components/ui/background-logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, User } from 'lucide-react';
import { VENDEDOR_IDS, VENDEDOR_TIPOS, getVendedorTipo } from '@/lib/utils/vendedores';

export default function ControleClosersPage() {
  const router = useRouter();

  // Filtrar apenas closers
  const closers = useMemo(() => {
    return Object.keys(VENDEDOR_IDS).filter(vendedor => {
      const tipo = getVendedorTipo(vendedor);
      return tipo === 'closer';
    });
  }, []);

  const handleSelectVendedor = (vendedorNome: string) => {
    // Criar slug do nome do vendedor
    const slug = vendedorNome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
    
    router.push(`/controle-closers/${slug}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <BackgroundLogo />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="w-auto max-w-4xl mx-auto flex flex-col items-center">
          {/* Header */}
          <div className="mb-6 md:mb-8 w-full text-center">
            <div className="flex items-center justify-center gap-3 md:gap-4 mb-2">
              <Target className="text-[#fed094] flex-shrink-0" style={{ width: 'clamp(1.5rem, 3vw, 2rem)', height: 'clamp(1.5rem, 3vw, 2rem)' }} />
              <h1 className="text-white font-bold" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
                Controle de Closers
              </h1>
            </div>
            <p className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.125rem)' }}>
              Selecione um Closer para gerenciar suas negociações
            </p>
          </div>

          {/* Lista de Closers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full justify-items-center">
            {closers.map((vendedor) => (
              <Card
                key={vendedor}
                className="bg-[#2A2A2A]/50 border border-[#3A3A3A] hover:border-[#fed094]/50 transition-colors cursor-pointer w-full max-w-sm"
                onClick={() => handleSelectVendedor(vendedor)}
              >
                <CardHeader style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#fed094]/20 rounded-lg">
                      <User className="text-[#fed094]" style={{ width: 'clamp(1.25rem, 2.5vw, 1.5rem)', height: 'clamp(1.25rem, 2.5vw, 1.5rem)' }} />
                    </div>
                    <CardTitle className="text-white" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
                      {vendedor}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent style={{ padding: 'clamp(0.75rem, 1.5vw, 1rem)', paddingTop: 0 }}>
                  <Button
                    className="w-full bg-[#fed094] hover:bg-[#fed094]/80 text-black"
                    style={{ fontSize: 'clamp(0.875rem, 1.8vw, 1rem)', padding: 'clamp(0.5rem, 1vw, 0.75rem)' }}
                  >
                    Acessar Controle
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {closers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#CCCCCC]" style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
                Nenhum Closer encontrado.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
