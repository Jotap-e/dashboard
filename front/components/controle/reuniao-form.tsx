'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Check } from 'lucide-react';
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
  const [formData, setFormData] = useState<ReuniaoFormData>({
    clienteNome: '',
    clienteNumero: '',
    data: new Date().toISOString().split('T')[0],
  });

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
