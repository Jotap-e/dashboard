/**
 * Mapeamento de nomes de vendedores para seus IDs no RD Station
 */
export const VENDEDOR_IDS: Record<string, string> = {
  'João Vitor Martins Ribeiro': '6936c37038809600166ca22a',
  'Juliana Costa': '699741ae6f4b3c0013e9fe26',
  'Thalia Batista': '69824580b58d7a00132a276c',
  'Vinicius Oliveira': '69330c5c687733001309154c',
  'Yuri Rafael dos Santos': '6978eabe122529001e60f427',
  'Gabriel': '6977ff083826b100179751c5',
  'Rafael Ratão': '6936c73f7f78ac001e4278e0',
};

/**
 * Tipo de vendedor: Closer ou SDR
 */
export type TipoVendedor = 'closer' | 'sdr';

/**
 * Mapeamento de vendedores para seus tipos (Closer ou SDR)
 */
export const VENDEDOR_TIPOS: Record<string, TipoVendedor> = {
  'João Vitor Martins Ribeiro': 'closer',
  'Juliana Costa': 'closer',
  'Thalia Batista': 'closer',
  'Vinicius Oliveira': 'closer',
  'Yuri Rafael dos Santos': 'closer',
  'Gabriel': 'sdr',
  'Rafael Ratão': 'sdr',
};

/**
 * Obtém o tipo do vendedor (closer ou sdr)
 */
export function getVendedorTipo(vendedorNome: string): TipoVendedor | null {
  return VENDEDOR_TIPOS[vendedorNome] || null;
}

/**
 * Remove acentos de uma string para normalização
 */
function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Mapeamento de slugs para nomes completos dos vendedores
 * Inclui variações com e sem acentos
 */
export const SLUG_TO_VENDEDOR: Record<string, string> = {
  // João Vitor - com acento
  'joão-vitor-martins-ribeiro': 'João Vitor Martins Ribeiro',
  'joão-vitor': 'João Vitor Martins Ribeiro',
  // João Vitor - sem acento
  'joao-vitor-martins-ribeiro': 'João Vitor Martins Ribeiro',
  'joao-vitor': 'João Vitor Martins Ribeiro',
  // Outros vendedores
  'juliana-costa': 'Juliana Costa',
  'juliana': 'Juliana Costa',
  'thalia-batista': 'Thalia Batista',
  'vinicius-oliveira': 'Vinicius Oliveira',
  'yuri-rafael-dos-santos': 'Yuri Rafael dos Santos',
  'yuri': 'Yuri Rafael dos Santos',
  'gabriel': 'Gabriel',
  'rafael-ratão': 'Rafael Ratão',
  'rafael-ratao': 'Rafael Ratão',
  'rafael': 'Rafael Ratão',
};

/**
 * Obtém o ID do vendedor pelo nome
 * Lida com nomes URL-encoded, com ou sem acentos
 */
export function getVendedorId(nome: string): string | null {
  if (!nome) return null;
  
  // Decodificar se estiver URL-encoded (ex: %c3%a3 -> ã)
  let decodedName = nome;
  try {
    decodedName = decodeURIComponent(nome);
  } catch (error) {
    // Se não conseguir decodificar, usar o nome original
    decodedName = nome;
  }
  
  // Tentar correspondência exata primeiro
  if (VENDEDOR_IDS[decodedName]) {
    return VENDEDOR_IDS[decodedName];
  }
  
  // Se não encontrar, tentar correspondência sem acentos (case-insensitive)
  const nomeNormalizado = removeAccents(decodedName);
  for (const [vendedorName, vendedorId] of Object.entries(VENDEDOR_IDS)) {
    if (removeAccents(vendedorName) === nomeNormalizado) {
      return vendedorId;
    }
  }
  
  // Tentar correspondência parcial (primeiro nome)
  const primeiroNome = decodedName.split(' ')[0];
  const primeiroNomeNormalizado = removeAccents(primeiroNome);
  for (const [vendedorName, vendedorId] of Object.entries(VENDEDOR_IDS)) {
    const vendedorPrimeiroNome = vendedorName.split(' ')[0];
    if (removeAccents(vendedorPrimeiroNome) === primeiroNomeNormalizado) {
      return vendedorId;
    }
  }
  
  return null;
}

/**
 * Converte um slug para o nome completo do vendedor
 * Lida com variações de acentuação (ex: "joão" vs "joao")
 */
export function slugToVendedorName(slug: string): string | null {
  if (!slug) return null;
  
  // Normalizar o slug (converter para lowercase e remover espaços)
  const normalizedSlug = slug.toLowerCase().trim();
  
  // Tentar encontrar correspondência exata primeiro (com ou sem acentos)
  if (SLUG_TO_VENDEDOR[normalizedSlug]) {
    return SLUG_TO_VENDEDOR[normalizedSlug];
  }
  
  // Normalizar o slug removendo acentos para comparação
  const slugSemAcentos = removeAccents(normalizedSlug);
  
  // Tentar encontrar correspondência parcial (slug começa com a chave ou vice-versa)
  // Priorizar correspondências mais longas
  const matches: Array<{ key: string; name: string; length: number }> = [];
  
  for (const [slugKey, vendedorName] of Object.entries(SLUG_TO_VENDEDOR)) {
    const slugKeySemAcentos = removeAccents(slugKey);
    
    // Correspondência exata (com ou sem acentos)
    if (slugKey === normalizedSlug || slugKeySemAcentos === slugSemAcentos) {
      return vendedorName;
    }
    
    // Correspondência parcial
    if (
      slugKeySemAcentos.startsWith(slugSemAcentos) || 
      slugSemAcentos.startsWith(slugKeySemAcentos)
    ) {
      matches.push({ key: slugKey, name: vendedorName, length: slugKey.length });
    }
  }
  
  // Se houver correspondências, retornar a mais longa (mais específica)
  if (matches.length > 0) {
    matches.sort((a, b) => b.length - a.length);
    return matches[0].name;
  }
  
  // Tentar encontrar nos nomes completos dos vendedores usando correspondência parcial
  for (const vendedorName of Object.keys(VENDEDOR_IDS)) {
    const vendedorSlug = removeAccents(vendedorName).replace(/\s+/g, '-');
    if (vendedorSlug.startsWith(slugSemAcentos) || slugSemAcentos.startsWith(vendedorSlug.split('-')[0])) {
      return vendedorName;
    }
  }
  
  // Se não encontrar, tentar capitalizar o slug como fallback
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
