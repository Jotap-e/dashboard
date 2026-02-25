// Tipos para negociações do painel

export type StatusNegociacao = 'indicacao' | 'conectado' | 'agendado' | 'agendado_sdr' | 'reuniao' | 'negociacao' | 'ganho';
export type TipoBloco = 'forecast' | 'closer' | 'sdr';

export interface Negociacao {
  id: string;
  cliente: string;
  numero?: string; // Número de telefone do cliente
  contact_id?: string; // ID do contato no RD Station
  status: StatusNegociacao;
  tarefa: string;
  vendedor: string;
  tipo?: TipoBloco; // Tipo de bloco: forecast, closer ou sdr (adicionado dinamicamente)
  isNow?: boolean; // Flag para destacar a negociação em andamento
  valor?: number;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

export interface NegociacoesPorVendedor {
  vendedor: string;
  negociacoes: Negociacao[];
}
