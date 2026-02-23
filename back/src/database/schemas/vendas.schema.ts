/**
 * Schema para Vendas no MongoDB
 * Cada registro = uma venda de um closer.
 * Valor do time = somatório de valorNegociacao após GET de vendas.
 */
export interface VendaDocument {
  _id?: string;
  vendedorId: string; // ID do vendedor no RD Station
  vendedorNome: string; // Nome do vendedor
  data: string; // Data no formato YYYY-MM-DD
  negociacaoId: string; // ID da negociação que foi vendida
  valorNegociacao: number; // Valor da negociação vendida
  clienteNumero?: string; // Telefone do cliente associado à deal
  createdAt: string; // Data de criação/salvamento ISO
}
