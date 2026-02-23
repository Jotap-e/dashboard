/**
 * Schema para Reuniões no MongoDB
 * - vendedorNome: resolvido a partir do vendedorId (nome associado ao ID)
 * - clienteNome: deal.name (fluxo now) ou preenchido no form (manual)
 * - Contagem: GET /reunioes?vendedorId=xxx&data=xxx → quantidade = data.length
 * - Não armazena totalReunioesVendedor/totalReunioesTime (processados separadamente)
 */
export interface ReuniaoDocument {
  _id?: string;
  vendedorId: string; // ID do vendedor no RD Station
  vendedorNome: string; // Nome do vendedor (resolvido do vendedorId)
  data: string; // Data no formato YYYY-MM-DD
  negociacaoId: string; // ID da negociação marcada como "now" ou "manual"
  clienteNome: string; // Nome do cliente (deal.name ou form)
  clienteNumero?: string; // Telefone do cliente (opcional)
  createdAt: string; // Data de criação/salvamento ISO
}
