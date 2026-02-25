import { Negociacao } from '@/lib/types/negociacoes';
import { Forecast } from '@/lib/types/forecast';
import { VENDEDOR_IDS } from '@/lib/utils/vendedores';

/**
 * Dados mockados para o painel baseados nos cards renderizados no controle
 * Replica a estrutura de negociações "now" que seriam exibidas no painel
 */

export interface MockPainelDeal {
  dealId: string;
  ownerId: string;
  negociacao: Negociacao;
}

export interface MockMetaDiaria {
  vendedor_id: string;
  vendedor_nome: string;
  meta: number;
  valor_acumulado: number;
  updated_at: string;
}

/**
 * Mapeamento de owner_id para deal "now" mockada
 * Baseado nos dados do controle, cada vendedor pode ter uma negociação "now"
 */
export const mockPainelDeals: MockPainelDeal[] = [
  // Thalia Batista
  {
    dealId: 'mock-thalia-1',
    ownerId: VENDEDOR_IDS['Thalia Batista'],
    negociacao: {
      id: 'mock-thalia-1',
      cliente: 'Henrique Oliveira Araujo',
      numero: '(11) 98765-4321',
      status: 'negociacao',
      isNow: true,
      tarefa: 'Negociar condições de pagamento',
      valor: 12000,
      vendedor: 'Thalia Batista',
    },
  },
  // Vinicius Oliveira
  {
    dealId: 'mock-vinicius-1',
    ownerId: VENDEDOR_IDS['Vinicius Oliveira'],
    negociacao: {
      id: 'mock-vinicius-1',
      cliente: 'WILLIAM ROGER NEME',
      numero: '(11) 91234-5678',
      status: 'negociacao',
      isNow: true,
      tarefa: 'Revisar termos contratuais',
      valor: 0, // Valor não definido
      vendedor: 'Vinicius Oliveira',
    },
  },
  // Yuri Rafael dos Santos
  {
    dealId: 'mock-yuri-1',
    ownerId: VENDEDOR_IDS['Yuri Rafael dos Santos'],
    negociacao: {
      id: 'mock-yuri-1',
      cliente: 'Felipe',
      numero: '(11) 99876-5432',
      status: 'reuniao',
      isNow: true,
      tarefa: 'Agendar demo do produto',
      valor: 6600,
      vendedor: 'Yuri Rafael dos Santos',
    },
  },
  // João Vitor Martins Ribeiro
  {
    dealId: 'mock-joao-1',
    ownerId: VENDEDOR_IDS['João Vitor Martins Ribeiro'],
    negociacao: {
      id: 'mock-joao-1',
      cliente: 'Mega Empresa S.A.',
      numero: '(11) 99999-8888',
      status: 'reuniao',
      isNow: true,
      tarefa: 'Preparar apresentação executiva',
      valor: 80000,
      vendedor: 'João Vitor Martins Ribeiro',
    },
  },
  // Juliana Costa
  {
    dealId: 'mock-juliana-1',
    ownerId: VENDEDOR_IDS['Juliana Costa'],
    negociacao: {
      id: 'mock-juliana-1',
      cliente: 'Empresa ABC Ltda',
      numero: '(11) 98888-7777',
      status: 'negociacao',
      isNow: true,
      tarefa: 'Enviar proposta comercial até 22/02',
      valor: 15000,
      vendedor: 'Juliana Costa',
    },
  },
];

/**
 * Metas diárias mockadas para cada vendedor
 */
export const mockMetasDiarias: MockMetaDiaria[] = [
  {
    vendedor_id: VENDEDOR_IDS['Thalia Batista'],
    vendedor_nome: 'Thalia Batista',
    meta: 50000,
    valor_acumulado: 12000,
    updated_at: new Date().toISOString(),
  },
  {
    vendedor_id: VENDEDOR_IDS['Vinicius Oliveira'],
    vendedor_nome: 'Vinicius Oliveira',
    meta: 80000,
    valor_acumulado: 0,
    updated_at: new Date().toISOString(),
  },
  {
    vendedor_id: VENDEDOR_IDS['Yuri Rafael dos Santos'],
    vendedor_nome: 'Yuri Rafael dos Santos',
    meta: 60000,
    valor_acumulado: 6600,
    updated_at: new Date().toISOString(),
  },
  {
    vendedor_id: VENDEDOR_IDS['João Vitor Martins Ribeiro'],
    vendedor_nome: 'João Vitor Martins Ribeiro',
    meta: 100000,
    valor_acumulado: 80000,
    updated_at: new Date().toISOString(),
  },
  {
    vendedor_id: VENDEDOR_IDS['Juliana Costa'],
    vendedor_nome: 'Juliana Costa',
    meta: 70000,
    valor_acumulado: 15000,
    updated_at: new Date().toISOString(),
  },
];

/**
 * Converte os dados mockados para o formato esperado pelo painel
 * Retorna um array de [ownerId, dealId] para simular o estado do WebSocket
 */
export function getMockPainelState(): Array<[string, string]> {
  return mockPainelDeals.map((deal) => [deal.ownerId, deal.dealId]);
}

/**
 * Converte os dados mockados de metas para o formato esperado pelo painel
 * Retorna um array de [vendedor_id, MetaDiaria] para simular o estado do WebSocket
 */
export function getMockMetasState(): Array<[string, MockMetaDiaria]> {
  return mockMetasDiarias.map((meta) => [meta.vendedor_id, meta]);
}

/**
 * Busca uma negociação mockada pelo dealId
 */
export function getMockNegociacaoByDealId(dealId: string): Negociacao | null {
  const deal = mockPainelDeals.find((d) => d.dealId === dealId);
  return deal ? deal.negociacao : null;
}

/**
 * Busca todas as negociações mockadas de um vendedor específico
 */
export function getMockNegociacoesByVendedor(vendedor: string): Negociacao[] {
  return mockPainelDeals
    .filter((deal) => deal.negociacao.vendedor === vendedor)
    .map((deal) => deal.negociacao);
}

/**
 * Forecasts mockados para closers
 */
export const mockForecasts: Forecast[] = [
  {
    id: 'forecast-1',
    vendedorId: VENDEDOR_IDS['Thalia Batista'],
    closerNome: 'Thalia Batista',
    clienteNome: 'Gustavo',
    clienteNumero: '(11) 98765-4321',
    data: new Date().toISOString().split('T')[0],
    horario: '14:00',
    valor: 15000,
    observacoes: 'Cliente interessado em proposta personalizada',
    primeiraCall: new Date().toISOString().split('T')[0], // Data da primeira call
    negociacaoId: 'mock-thalia-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'forecast-2',
    vendedorId: VENDEDOR_IDS['Thalia Batista'],
    closerNome: 'Thalia Batista',
    clienteNome: 'Eduardo',
    clienteNumero: '(11) 91234-5678',
    data: new Date().toISOString().split('T')[0],
    horario: '16:30',
    valor: 20000,
    observacoes: 'Reunião de apresentação do produto',
    primeiraCall: '', // Sem data de primeira call
    negociacaoId: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'forecast-3',
    vendedorId: VENDEDOR_IDS['João Vitor Martins Ribeiro'],
    closerNome: 'João Vitor Martins Ribeiro',
    clienteNome: 'Mega Empresa S.A.',
    clienteNumero: '(11) 99999-8888',
    data: new Date().toISOString().split('T')[0],
    horario: '10:00',
    valor: 80000,
    observacoes: 'Apresentação executiva agendada',
    primeiraCall: '', // Sem data de primeira call
    negociacaoId: 'mock-joao-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Converte forecasts mockados para o formato esperado pelo painel
 * Retorna um Map de vendedor_id -> Forecast[]
 */
export function getMockForecastsMap(): Map<string, Forecast[]> {
  const forecastsMap = new Map<string, Forecast[]>();
  
  mockForecasts.forEach((forecast) => {
    const existing = forecastsMap.get(forecast.vendedorId) || [];
    forecastsMap.set(forecast.vendedorId, [...existing, forecast]);
  });
  
  return forecastsMap;
}
