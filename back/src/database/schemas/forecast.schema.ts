/**
 * Schema para Forecasts no MongoDB
 */
export interface ForecastDocument {
  _id?: string;
  id: string; // ID único do forecast
  vendedorId: string; // ID do vendedor no RD Station
  closerNome: string; // Nome do closer que criou o forecast
  clienteNome: string; // Nome do cliente
  clienteNumero: string; // Número de telefone do cliente
  data: string; // Data no formato YYYY-MM-DD
  horario: string; // Horário no formato HH:mm
  valor: number; // Valor do forecast
  observacoes: string; // Observações
  primeiraCall: string; // Data da primeira call no formato YYYY-MM-DD
  negociacaoId?: string; // ID da negociação relacionada (opcional)
  dataCriacao: string; // Data de criação YYYY-MM-DD
  horaCriacao: string; // Hora de criação HH:mm:ss
  createdAt: string; // Data de criação ISO
  updatedAt: string; // Data de atualização ISO
  savedAt: string; // Data de salvamento no banco ISO
}
