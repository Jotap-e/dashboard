'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Check } from 'lucide-react';

interface MetaInputProps {
  vendedorNome: string;
  vendedorId: string;
  metaAtual?: number;
  valorAcumulado?: number;
  onSave: (vendedorId: string, vendedorNome: string, meta: number) => void;
  isLoading?: boolean;
}

// Formata número para exibição monetária (R$ 50.000)
const formatCurrencyDisplay = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Converte string formatada para número
const parseCurrencyInput = (value: string): number => {
  // Remove tudo exceto dígitos
  const digitsOnly = value.replace(/\D/g, '');
  if (!digitsOnly) return 0;
  return parseInt(digitsOnly, 10);
};

// Formata string de input para exibição monetária enquanto digita
const formatCurrencyInput = (value: string): string => {
  const numericValue = parseCurrencyInput(value);
  if (numericValue === 0) return '';
  return formatCurrencyDisplay(numericValue);
};

export function MetaInput({ vendedorNome, vendedorId, metaAtual, valorAcumulado = 0, onSave, isLoading }: MetaInputProps) {
  const [meta, setMeta] = useState<string>(metaAtual ? formatCurrencyDisplay(metaAtual) : '');
  const [isEditing, setIsEditing] = useState(false);

  // Calcular percentual de progresso
  const percentual = metaAtual && metaAtual > 0 ? (valorAcumulado / metaAtual) * 100 : 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Formata enquanto digita
    const formatted = formatCurrencyInput(inputValue);
    setMeta(formatted);
  };

  const handleSave = () => {
    const metaValue = parseCurrencyInput(meta);
    if (metaValue > 0) {
      onSave(vendedorId, vendedorNome, metaValue);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setMeta(metaAtual ? formatCurrencyDisplay(metaAtual) : '');
    setIsEditing(false);
  };

  return (
    <Card className="mb-4 bg-[#2A2A2A]/50 border border-[#3A3A3A]">
      <CardHeader style={{ padding: 'clamp(0.625rem, 1vw, 0.875rem)' }}>
        <CardTitle className="flex items-center gap-1.5 md:gap-2 text-white" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.125rem)' }}>
          <Target className="text-[#fed094] flex-shrink-0" style={{ width: 'clamp(1rem, 2vw, 1.25rem)', height: 'clamp(1rem, 2vw, 1.25rem)' }} />
          Meta Diária
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: 'clamp(0.625rem, 1vw, 0.875rem)', paddingTop: 0 }}>
        {!isEditing ? (
          <div className="space-y-2 md:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[#CCCCCC] mb-0.5 md:mb-1" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                  Meta atual:
                </p>
                <p className="text-white font-semibold truncate" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.25rem)' }}>
                  {metaAtual ? formatCurrencyDisplay(metaAtual) : 'Não definida'}
                </p>
              </div>
              <Button
                onClick={() => {
                  setMeta(metaAtual ? formatCurrencyDisplay(metaAtual) : '');
                  setIsEditing(true);
                }}
                className="bg-[#fed094] hover:bg-[#fed094]/80 text-black flex-shrink-0 w-full sm:w-auto self-start sm:self-auto"
                style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)', padding: 'clamp(0.5rem, 1vw, 0.625rem) clamp(0.75rem, 1.5vw, 1.25rem)' }}
              >
                {metaAtual ? 'Editar' : 'Definir Meta'}
              </Button>
            </div>

            {/* Barra de progresso */}
            {metaAtual && metaAtual > 0 && (
              <div className="space-y-1.5 md:space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#CCCCCC] truncate" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                    Acumulado: {formatCurrencyDisplay(valorAcumulado)}
                  </span>
                  <span className="text-[#CCCCCC] flex-shrink-0" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                    {percentual.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-[#1A1A1A] rounded-full" style={{ height: 'clamp(0.375rem, 0.8vw, 0.625rem)' }}>
                  <div
                    className={`rounded-full transition-all duration-300 ${
                      percentual >= 100 ? 'bg-green-500' : percentual >= 70 ? 'bg-[#fed094]' : 'bg-blue-500'
                    }`}
                    style={{
                      height: '100%',
                      width: `${Math.min(percentual, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-[#CCCCCC] truncate" style={{ fontSize: 'clamp(0.5625rem, 1.2vw, 0.6875rem)' }}>
                    {formatCurrencyDisplay(Math.max(0, metaAtual - valorAcumulado))} restante
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 md:space-y-3">
            <div>
              <label className="block text-[#CCCCCC] mb-1.5 md:mb-2" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                Valor da meta (R$):
              </label>
              <input
                type="text"
                value={meta}
                onChange={handleInputChange}
                placeholder="R$ 0"
                className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded px-2 md:px-3 py-1.5 md:py-2 text-white focus:outline-none focus:border-[#fed094]"
                style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}
                autoFocus
              />
            </div>
            <div className="flex gap-1.5 md:gap-2">
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 bg-[#fed094] hover:bg-[#fed094]/80 text-black disabled:opacity-50"
                style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)', padding: 'clamp(0.5rem, 1vw, 0.625rem)' }}
              >
                <Check className="mr-1 md:mr-1.5 flex-shrink-0" style={{ width: 'clamp(0.875rem, 1.5vw, 1.125rem)', height: 'clamp(0.875rem, 1.5vw, 1.125rem)' }} />
                Confirmar
              </Button>
              <Button
                onClick={handleCancel}
                disabled={isLoading}
                variant="outline"
                className="flex-1 border-[#3A3A3A] text-[#CCCCCC] hover:bg-[#3A3A3A] disabled:opacity-50"
                style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)', padding: 'clamp(0.5rem, 1vw, 0.625rem)' }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
