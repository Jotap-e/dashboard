'use client';

import { Forecast } from '@/lib/types/forecast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone } from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

interface ForecastTableProps {
  forecasts: Forecast[];
  vendedorNome: string;
}

export function ForecastTable({ forecasts, vendedorNome }: ForecastTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (forecasts.length === 0) {
    return (
      <Card className="mb-4 bg-[#2A2A2A]/50 border border-[#3A3A3A]">
        <CardHeader style={{ padding: 'clamp(0.5rem, 1vw, 0.75rem)' }}>
          <CardTitle className="text-white" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.125rem)' }}>
            Forecast do Dia - {vendedorNome}
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: 'clamp(0.5rem, 1vw, 0.75rem)' }}>
          <p className="text-[#CCCCCC] text-center py-4" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.9375rem)' }}>
            Nenhum forecast cadastrado para hoje.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 bg-[#2A2A2A]/50 border border-[#3A3A3A]">
      <CardHeader style={{ padding: 'clamp(0.5rem, 1vw, 0.75rem)' }}>
        <CardTitle className="text-white" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.125rem)' }}>
          Forecast do Dia - {vendedorNome}
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: 'clamp(0.5rem, 1vw, 0.75rem)' }}>
        <div className="overflow-x-auto -mx-1 scrollbar-hide" style={{ maxWidth: '100%' }}>
          <table className="w-full border-collapse" style={{ minWidth: 'min(480px, 100%)' }}>
            <thead>
              <tr className="border-b border-[#3A3A3A]">
                <th className="text-left text-[#CCCCCC] py-2 px-1.5 md:px-2 whitespace-nowrap" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.8125rem)' }}>
                  Nome
                </th>
                <th className="text-left text-[#CCCCCC] py-2 px-1.5 md:px-2 whitespace-nowrap" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.8125rem)' }}>
                  Número
                </th>
                <th className="text-left text-[#CCCCCC] py-2 px-1.5 md:px-2 whitespace-nowrap" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.8125rem)' }}>
                  Data
                </th>
                <th className="text-left text-[#CCCCCC] py-2 px-1.5 md:px-2 whitespace-nowrap" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.8125rem)' }}>
                  Horário
                </th>
                <th className="text-left text-[#CCCCCC] py-2 px-1.5 md:px-2 whitespace-nowrap" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.8125rem)' }}>
                  Valor
                </th>
                <th className="text-left text-[#CCCCCC] py-2 px-1.5 md:px-2 hidden md:table-cell" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.8125rem)' }}>
                  Observações
                </th>
                <th className="text-left text-[#CCCCCC] py-2 px-1.5 md:px-2 hidden lg:table-cell whitespace-nowrap" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.8125rem)' }}>
                  Primeira Call
                </th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map((forecast) => (
                <tr key={forecast.id} className="border-b border-[#3A3A3A]/50 hover:bg-[#3A3A3A]/30">
                  <td className="text-white py-2 px-1.5 md:px-2 min-w-[80px]" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    {forecast.clienteNome}
                  </td>
                  <td className="text-[#CCCCCC] py-2 px-1.5 md:px-2" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    {forecast.clienteNumero ? (
                      <div className="flex items-center gap-1.5">
                        <Phone className="flex-shrink-0 text-white hidden sm:block" style={{ width: 'clamp(0.75rem, 1.2vw, 0.875rem)', height: 'clamp(0.75rem, 1.2vw, 0.875rem)' }} />
                        <span className="whitespace-nowrap">{forecast.clienteNumero}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="text-[#CCCCCC] py-2 px-1.5 md:px-2 whitespace-nowrap" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    {formatDate(forecast.data)}
                  </td>
                  <td className="text-[#CCCCCC] py-2 px-1.5 md:px-2 whitespace-nowrap" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    {forecast.horario}
                  </td>
                  <td className="text-white font-semibold py-2 px-1.5 md:px-2 whitespace-nowrap" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    {forecast.valor > 0 ? formatCurrency(forecast.valor) : '-'}
                  </td>
                  <td className="text-[#CCCCCC] py-2 px-1.5 md:px-2 max-w-xs truncate hidden md:table-cell" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }} title={forecast.observacoes}>
                    {forecast.observacoes || '-'}
                  </td>
                  <td className="text-[#CCCCCC] py-2 px-1.5 md:px-2 hidden lg:table-cell" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    {forecast.primeiraCall ? formatDate(forecast.primeiraCall) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
