'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ForecastFormData, Forecast } from '@/lib/types/forecast';
import { Calendar, Clock, DollarSign, FileText, Phone, User, Check } from 'lucide-react';
import { Negociacao } from '@/lib/types/negociacoes';

interface ForecastFormProps {
  negociacao?: Negociacao | null;
  forecast?: Forecast | null; // Forecast existente para edição
  closerNome: string;
  vendedorId: string;
  onSave: (forecast: ForecastFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Formata número de telefone brasileiro: (00) 00000-0000
 */
function formatPhoneNumber(value: string): string {
  // Remove tudo que não é dígito
  const digitsOnly = value.replace(/\D/g, '');
  
  // Aplica a máscara conforme o tamanho
  if (digitsOnly.length <= 2) {
    return digitsOnly.length > 0 ? `(${digitsOnly}` : '';
  } else if (digitsOnly.length <= 7) {
    return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2)}`;
  } else if (digitsOnly.length <= 10) {
    return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 7)}-${digitsOnly.slice(7)}`;
  } else {
    // Limita a 11 dígitos (com DDD + 9 dígitos)
    return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 7)}-${digitsOnly.slice(7, 11)}`;
  }
}

export function ForecastForm({ 
  negociacao, 
  forecast,
  closerNome, 
  vendedorId, 
  onSave, 
  onCancel,
  isLoading = false 
}: ForecastFormProps) {
  const dataInputRef = useRef<HTMLInputElement>(null);
  const horarioInputRef = useRef<HTMLInputElement>(null);
  const primeiraCallInputRef = useRef<HTMLInputElement>(null);
  const valorInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ForecastFormData>({
    clienteNome: '',
    clienteNumero: '',
    data: new Date().toISOString().split('T')[0], // Data de hoje
    horario: '',
    valor: 0,
    observacoes: '',
    primeiraCall: '', // Data da primeira call (vazio por padrão)
  });

  // Estado para controlar o valor formatado no input (para melhor UX durante digitação)
  const [valorDisplay, setValorDisplay] = useState<string>('');

  // Preencher formulário quando uma negociação ou forecast for selecionado
  useEffect(() => {
    if (forecast) {
      // Preencher com dados do forecast existente (modo edição)
      const numeroFormatado = forecast.clienteNumero ? formatPhoneNumber(forecast.clienteNumero) : '';
      const valorInicial = forecast.valor || 0;
      setFormData({
        clienteNome: forecast.clienteNome || '',
        clienteNumero: numeroFormatado,
        data: forecast.data || new Date().toISOString().split('T')[0],
        horario: forecast.horario || '',
        valor: valorInicial,
        observacoes: forecast.observacoes || '',
        primeiraCall: forecast.primeiraCall || '',
      });
      // Atualizar display do valor formatado
      setValorDisplay(valorInicial > 0 ? formatValueForInput(valorInicial) : '');
    } else if (negociacao) {
      // Formatar o número se já existir
      const numeroFormatado = negociacao.numero ? formatPhoneNumber(negociacao.numero) : '';
      const valorInicial = negociacao.valor || 0;
      setFormData({
        clienteNome: negociacao.cliente || '',
        clienteNumero: numeroFormatado, // Preencher com o número formatado da negociação
        data: new Date().toISOString().split('T')[0],
        horario: '',
        valor: valorInicial,
        observacoes: negociacao.tarefa || '',
        primeiraCall: '', // Data da primeira call (vazio por padrão)
      });
      // Atualizar display do valor formatado (vazio se não houver valor)
      setValorDisplay(valorInicial > 0 ? formatValueForInput(valorInicial) : '');
    } else {
      // Resetar formulário quando nenhuma negociação estiver selecionada
      setFormData({
        clienteNome: '',
        clienteNumero: '',
        data: new Date().toISOString().split('T')[0],
        horario: '',
        valor: 0,
        observacoes: '',
        primeiraCall: '', // Data da primeira call (vazio por padrão)
      });
      setValorDisplay('');
    }
  }, [negociacao, forecast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.clienteNome.trim()) {
      onSave(formData);
    }
  };

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
    
    // Converter para número
    const numericValue = parseFloat(digitsOnly);
    
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
      // Remover formatação para permitir edição fácil
      const digitsOnly = formData.valor.toString().replace(/\D/g, '');
      setValorDisplay(digitsOnly);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, clienteNumero: formatted });
  };

  // Permitir criação manual de forecast (sem negociacao ou forecast)
  // O formulário será exibido mesmo sem negociacao/forecast para permitir criação manual

  return (
    <Card className="mb-4 bg-[#2A2A2A]/50 border border-[#3A3A3A]">
      <CardHeader style={{ padding: 'clamp(0.625rem, 1vw, 0.875rem)' }}>
        <CardTitle className="flex items-center gap-1.5 md:gap-2 text-white" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.125rem)' }}>
          {forecast 
            ? `Editar Forecast - ${forecast.clienteNome}` 
            : negociacao 
              ? `Adicionar Forecast - ${negociacao.cliente}` 
              : 'Criar Forecast Manual'}
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: 'clamp(0.625rem, 1vw, 0.875rem)' }}>
        {/* Dica para forecast manual */}
        {!negociacao && !forecast && (
          <div className="mb-3 p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-[#CCCCCC] text-center" style={{ fontSize: 'clamp(0.6875rem, 1.2vw, 0.8125rem)' }}>
              💡 <strong>Forecast Manual:</strong> Use quando o cliente ainda não possui dados cadastrados no CRM (RD Station)
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Nome do Cliente */}
            <div>
              <label className="block text-[#CCCCCC] mb-1.5" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                Nome do Cliente
              </label>
              <input
                type="text"
                value={formData.clienteNome}
                onChange={(e) => setFormData({ ...formData, clienteNome: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded px-2 md:px-3 py-1.5 md:py-2 text-white focus:outline-none focus:border-[#fed094]"
                style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}
                required
              />
            </div>

            {/* Número */}
            <div>
              <label className="block text-[#CCCCCC] mb-1.5" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                Número
              </label>
              <input
                type="text"
                value={formData.clienteNumero}
                onChange={handlePhoneNumberChange}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded px-2 md:px-3 py-1.5 md:py-2 text-white focus:outline-none focus:border-[#fed094]"
                style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}
              />
            </div>

            {/* Data */}
            <div 
              className="cursor-pointer"
              onClick={() => dataInputRef.current?.showPicker?.() || dataInputRef.current?.focus()}
            >
              <label className="block text-[#CCCCCC] mb-1.5" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                Data
              </label>
              <input
                ref={dataInputRef}
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded px-2 md:px-3 py-1.5 md:py-2 text-white focus:outline-none focus:border-[#fed094] cursor-pointer"
                style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}
                required
              />
            </div>

            {/* Horário */}
            <div 
              className="cursor-pointer"
              onClick={() => horarioInputRef.current?.showPicker?.() || horarioInputRef.current?.focus()}
            >
              <label className="block text-[#CCCCCC] mb-1.5" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                Horário
              </label>
              <input
                ref={horarioInputRef}
                type="time"
                value={formData.horario}
                onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded px-2 md:px-3 py-1.5 md:py-2 text-white focus:outline-none focus:border-[#fed094] cursor-pointer"
                style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}
              />
            </div>

            {/* Valor */}
            <div>
              <label className="block text-[#CCCCCC] mb-1.5" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                Valor
              </label>
              <div className="relative">
                <input
                  ref={valorInputRef}
                  type="text"
                  value={valorDisplay}
                  onChange={handleValorChange}
                  onBlur={handleValorBlur}
                  onFocus={handleValorFocus}
                  placeholder="R$ 0,00"
                  className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded px-2 md:px-3 py-1.5 md:py-2 text-white focus:outline-none focus:border-[#fed094] focus:ring-1 focus:ring-[#fed094]"
                  style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}
                />
                {formData.valor === 0 && !valorDisplay && (
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#888888] pointer-events-none" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    Opcional
                  </span>
                )}
              </div>
            </div>

            {/* Primeira Call */}
            <div 
              className="cursor-pointer"
              onClick={() => primeiraCallInputRef.current?.showPicker?.() || primeiraCallInputRef.current?.focus()}
            >
              <label className="block text-[#CCCCCC] mb-1.5" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
                Primeira Call
              </label>
              <input
                ref={primeiraCallInputRef}
                type="date"
                value={formData.primeiraCall}
                onChange={(e) => setFormData({ ...formData, primeiraCall: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded px-2 md:px-3 py-1.5 md:py-2 text-white focus:outline-none focus:border-[#fed094] cursor-pointer"
                style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}
              />
            </div>
          </div>

          {/* Texto informativo sobre preenchimento manual */}
          <div className="mt-2 mb-1">
            <p className="text-[#888888]" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)' }}>
              💡 Você pode preencher manualmente os campos <strong>Valor</strong>, <strong>Primeira Call</strong>, <strong>Horário</strong> e <strong>Número</strong> mesmo que não estejam preenchidos na negociação
            </p>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-[#CCCCCC] mb-1.5" style={{ fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)' }}>
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
              className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded px-2 md:px-3 py-1.5 md:py-2 text-white focus:outline-none focus:border-[#fed094] resize-none"
              style={{ fontSize: 'clamp(0.8125rem, 1.8vw, 0.9375rem)' }}
            />
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
              Salvar Forecast
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
