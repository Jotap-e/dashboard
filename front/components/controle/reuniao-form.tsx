'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Check, DollarSign } from 'lucide-react';
import { ReuniaoFormData } from '@/lib/types/reuniao';

function formatPhoneNumber(value: string): string {
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length <= 2) return digitsOnly.length > 0 ? `(${digitsOnly}` : '';
  if (digitsOnly.length <= 7) return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2)}`;
  return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 7)}-${digitsOnly.slice(7, 11)}`;
}

interface ReuniaoFormProps {
  closerNome: string;
  vendedorId: string;
  onSave: (data: ReuniaoFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ReuniaoForm({
  closerNome,
  vendedorId,
  onSave,
  onCancel,
  isLoading = false,
}: ReuniaoFormProps) {
  const valorInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ReuniaoFormData>({
    clienteNome: '',
    clienteNumero: '',
    data: new Date().toISOString().split('T')[0],
    valor: 0,
  });
  
  // Estado para controlar o valor formatado no input
  const [valorDisplay, setValorDisplay] = useState<string>('');

  // Função para formatar o valor para exibição no input
  const formatValueForInput = (value: number): string => {
    if (value === 0 || isNaN(value)) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Se o campo estiver vazio, limpar o valor
    if (!inputValue.trim()) {
      setFormData({ ...formData, valor: 0 });
      setValorDisplay('');
      return;
    }
    
    // Remover formatação existente (R$, pontos, vírgulas, espaços)
    const cleanedValue = inputValue
      .replace(/R\$\s*/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '')
      .replace(/\s/g, '');
    
    // Remover tudo exceto dígitos
    const digitsOnly = cleanedValue.replace(/\D/g, '');
    
    if (!digitsOnly) {
      setFormData({ ...formData, valor: 0 });
      setValorDisplay('');
      return;
    }
    
    // Converter para número (dividir por 100 para considerar centavos)
    const numericValue = parseFloat(digitsOnly) / 100;
    
    // Atualizar o valor numérico no estado
    setFormData({ ...formData, valor: numericValue });
    
    // Durante a digitação, mostrar apenas os dígitos (sem formatação)
    // A formatação será aplicada no onBlur
    setValorDisplay(digitsOnly);
  };

  const handleValorBlur = () => {
    // Quando o campo perde o foco, formatar o valor
    if (formData.valor > 0) {
      setValorDisplay(formatValueForInput(formData.valor));
    } else {
      setValorDisplay('');
    }
  };

  const handleValorFocus = () => {
    // Quando o campo ganha foco, mostrar apenas os dígitos para facilitar edição
    if (formData.valor > 0) {
      const digitsOnly = formData.valor.toString().replace(/\D/g, '').replace('.', '');
      setValorDisplay(digitsOnly);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.clienteNome.trim()) {
      onSave(formData);
    }
  };

  return (
    <Card className="mb-4 bg-[#2A2A2A]/50 border border-[#3A3A3A]">
      <CardHeader style={{ padding: 'clamp(0.625rem, 1vw, 0.875rem)' }}>
        <CardTitle className="flex items-center gap-1.5 md:gap-2 text-white" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.125rem)' }}>
          <Phone className="text-[#fed094] flex-shrink-0" style={{ width: 'clamp(1rem, 2vw, 1.25rem)', height: 'clamp(1rem, 2vw, 1.25rem)' }} />
          Criar Call Manual
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: 'clamp(0.625rem, 1vw, 0.875rem)' }}>
        <div className="mb-3 p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-[#CCCCCC] text-center" style={{ fontSize: 'clamp(0.6875rem, 1.2vw, 0.8125rem)' }}>
            💡 <strong>Call Manual:</strong> Use quando o cliente ainda não possui negociação cadastrada no CRM (RD Station)
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Nome do Cliente */}
            <div>
              <label className="block text-[#CCCCCC] mb-1.5" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                Nome do Cliente *
              </label>
              <input
                type="text"
                value={formData.clienteNome}
                onChange={(e) => setFormData({ ...formData, clienteNome: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded px-2 md:px-3 py-1.5 md:py-2 text-white focus:outline-none focus:border-[#fed094]"
                style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}
                placeholder="Nome do cliente"
                required
              />
            </div>

            {/* Telefone do Cliente */}
            <div>
              <label className="block text-[#CCCCCC] mb-1.5" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                Telefone do Cliente
              </label>
              <input
                type="text"
                value={formData.clienteNumero || ''}
                onChange={(e) => setFormData({ ...formData, clienteNumero: formatPhoneNumber(e.target.value) })}
                className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded px-2 md:px-3 py-1.5 md:py-2 text-white focus:outline-none focus:border-[#fed094]"
                style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            {/* Data da Call */}
            <div onClick={() => document.getElementById('reuniao-data-input')?.focus()} className="cursor-pointer">
              <label className="block text-[#CCCCCC] mb-1.5" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                Data da Call
              </label>
              <input
                id="reuniao-data-input"
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded px-2 md:px-3 py-1.5 md:py-2 text-white focus:outline-none focus:border-[#fed094] cursor-pointer"
                style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}
                required
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading || !formData.clienteNome.trim()}
              className="flex-1 bg-[#fed094] hover:bg-[#fed094]/80 text-black disabled:opacity-50"
              style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)', padding: 'clamp(0.5rem, 1vw, 0.625rem)' }}
            >
              <Check className="mr-1.5 flex-shrink-0" style={{ width: 'clamp(0.875rem, 1.5vw, 1.125rem)', height: 'clamp(0.875rem, 1.5vw, 1.125rem)' }} />
              Registrar Call
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              variant="outline"
              className="flex-1 border-[#3A3A3A] text-[#CCCCCC] hover:bg-[#3A3A3A] disabled:opacity-50"
              style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)', padding: 'clamp(0.5rem, 1vw, 0.625rem)' }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
