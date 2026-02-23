/**
 * Schema para Vendas (Valor Acumulado) no MongoDB
 */
export interface VendaDocument {
  _id?: string;
  vendedorId: string; // ID do vendedor no RD Station
  vendedorNome: string; // Nome do vendedor
  data: string; // Data no formato YYYY-MM-DD
  valorAcumulado: number; // Valor acumulado do vendedor
  valorTime: number; // Valor acumulado total do time
  negociacaoId: string; // ID da negociação que foi vendida
  valorNegociacao: number; // Valor da negociação vendida
  createdAt: string; // Data de criação/salvamento ISO
}
