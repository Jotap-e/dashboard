/**
 * Schema para Reuniões no MongoDB
 */
export interface ReuniaoDocument {
  _id?: string;
  vendedorId: string; // ID do vendedor no RD Station
  vendedorNome: string; // Nome do vendedor
  data: string; // Data no formato YYYY-MM-DD
  negociacaoId: string; // ID da negociação marcada como "now"
  clienteNome: string; // Nome do cliente
  totalReunioesVendedor: number; // Total de reuniões do vendedor no dia
  totalReunioesTime: number; // Total de reuniões do time no dia
  createdAt: string; // Data de criação/salvamento ISO
}
