/**
 * Tipos para Forecast de Closers
 */

export type ClassificacaoForecast = 'quente' | 'morno' | 'frio';

export interface Forecast {
  id: string;
  vendedorId: string;
  closerNome: string;
  clienteNome: string;
  clienteNumero: string;
  data: string; // Data no formato YYYY-MM-DD
  horario: string; // Horário no formato HH:mm
  valor: number;
  observacoes: string;
  primeiraCall: string; // Data da primeira call no formato YYYY-MM-DD
  negociacaoId?: string; // ID da negociação relacionada (opcional)
  classificacao: ClassificacaoForecast; // Classificação do forecast (quente/morno/frio)
  createdAt: string;
  updatedAt: string;
}

export interface ForecastFormData {
  clienteNome: string;
  clienteNumero: string;
  data: string;
  horario: string;
  valor: number;
  observacoes: string;
  primeiraCall: string; // Data da primeira call no formato YYYY-MM-DD
}
