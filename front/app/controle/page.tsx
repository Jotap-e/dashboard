'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockNegociacoes } from '../../lib/data/mock-negociacoes';

export default function ControleRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionar para o primeiro vendedor
    const primeiroVendedor = mockNegociacoes[0]?.vendedor;
    if (primeiroVendedor) {
      const slug = primeiroVendedor.toLowerCase().replace(/\s+/g, '-');
      router.replace(`/controle/${slug}`);
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-white" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)' }}>
        Redirecionando...
      </p>
    </div>
  );
}
