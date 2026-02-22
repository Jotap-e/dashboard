import { Injectable, Logger } from '@nestjs/common';

interface MetaDiaria {
  vendedor_id: string;
  vendedor_nome: string;
  meta: number;
  valor_acumulado: number;
  updated_at: string;
}

/**
 * Serviço para gerenciar estado em memória das metas diárias dos vendedores
 * Mantém os dados mesmo após refresh da página ou reconexão WebSocket
 */
@Injectable()
export class MetasStateService {
  private readonly logger = new Logger(MetasStateService.name);
  
  // Map para armazenar metas diárias (vendedor_id -> MetaDiaria)
  private readonly metasMap = new Map<string, MetaDiaria>();

  /**
   * Define ou atualiza a meta diária de um vendedor
   */
  setMeta(vendedorId: string, vendedorNome: string, meta: number): void {
    this.logger.log(`💾 [METAS] Definindo meta para vendedor ${vendedorNome} (${vendedorId}): R$ ${meta}`);
    
    const existingMeta = this.metasMap.get(vendedorId);
    
    this.metasMap.set(vendedorId, {
      vendedor_id: vendedorId,
      vendedor_nome: vendedorNome,
      meta: meta,
      valor_acumulado: existingMeta?.valor_acumulado || 0,
      updated_at: new Date().toISOString(),
    });
    
    this.logger.log(`✅ [METAS] Meta salva. Total de metas: ${this.metasMap.size}`);
  }

  /**
   * Atualiza o valor acumulado de um vendedor (soma dos valores dos deals "now")
   */
  updateValorAcumulado(vendedorId: string, valor: number): void {
    const meta = this.metasMap.get(vendedorId);
    if (meta) {
      meta.valor_acumulado = valor;
      meta.updated_at = new Date().toISOString();
      this.logger.log(`💰 [METAS] Valor acumulado atualizado para ${meta.vendedor_nome}: R$ ${valor}`);
    }
  }

  /**
   * Obtém a meta de um vendedor específico
   */
  getMeta(vendedorId: string): MetaDiaria | null {
    return this.metasMap.get(vendedorId) || null;
  }

  /**
   * Obtém todas as metas como array de arrays [vendedor_id, MetaDiaria]
   * Formato compatível com Map.entries() para serialização
   */
  getAllMetas(): Array<[string, MetaDiaria]> {
    return Array.from(this.metasMap.entries());
  }

  /**
   * Calcula a meta total do time (soma de todas as metas)
   */
  getMetaTotal(): number {
    let total = 0;
    this.metasMap.forEach((meta) => {
      total += meta.meta;
    });
    return total;
  }

  /**
   * Calcula o valor acumulado total do time (soma de todos os valores acumulados)
   */
  getValorAcumuladoTotal(): number {
    let total = 0;
    this.metasMap.forEach((meta) => {
      total += meta.valor_acumulado;
    });
    return total;
  }

  /**
   * Limpa todo o estado (útil para testes ou reset)
   */
  clear(): void {
    this.logger.log(`🧹 [METAS] Limpando todo o estado de metas`);
    this.metasMap.clear();
  }

  /**
   * Obtém estatísticas do estado atual
   */
  getStats(): { metasCount: number; metaTotal: number; valorAcumuladoTotal: number } {
    return {
      metasCount: this.metasMap.size,
      metaTotal: this.getMetaTotal(),
      valorAcumuladoTotal: this.getValorAcumuladoTotal(),
    };
  }
}
