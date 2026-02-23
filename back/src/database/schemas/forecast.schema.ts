/**
 * Schema para Forecasts no MongoDB
 */
export interface ForecastDocument {
  _id?: string;
  id: string; // ID único do forecast
  vendedorId: string; // ID do vendedor no RD Station
  vendedorNome: string; // Nome do vendedor
  clienteNome: string; // Nome do cliente
  clienteNumero: string; // Número de telefone do cliente
  data: string; // Data no formato YYYY-MM-DD
  horario: string; // Horário no formato HH:mm
  valor: number; // Valor do forecast
  observacoes: string; // Observações
  primeiraCall: string; // Data da primeira call no formato YYYY-MM-DD
  negociacaoId?: string; // ID da negociação relacionada (opcional)
  createdAt: string; // Data de criação ISO
  updatedAt: string; // Data de atualização ISO
  savedAt: string; // Data de salvamento no banco ISO
}
