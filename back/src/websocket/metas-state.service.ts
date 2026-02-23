import { Injectable, Logger } from '@nestjs/common';

interface MetaDiaria {
  vendedor_id: string;
  vendedor_nome: string;
  meta: number;
  valor_acumulado: number;
  qtd_reunioes: number;
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
   * Se valorAcumulado não for fornecido, preserva o valor existente
   * Se valorAcumulado for fornecido explicitamente, atualiza para esse valor
   */
  setMeta(vendedorId: string, vendedorNome: string, meta: number, valorAcumulado?: number): void {
    this.logger.log(`💾 [METAS] Definindo meta para vendedor ${vendedorNome} (${vendedorId}): R$ ${meta}`);
    
    const existingMeta = this.metasMap.get(vendedorId);
    
    // Se valorAcumulado foi fornecido explicitamente, usar esse valor
    // Caso contrário, preservar o valor existente (ou 0 se não existir)
    const novoValorAcumulado = valorAcumulado !== undefined 
      ? valorAcumulado 
      : (existingMeta?.valor_acumulado || 0);
    
    // Preservar quantidade de reuniões existente (ou 0 se não existir)
    const qtdReunioes = existingMeta?.qtd_reunioes || 0;
    
    this.metasMap.set(vendedorId, {
      vendedor_id: vendedorId,
      vendedor_nome: vendedorNome,
      meta: meta,
      valor_acumulado: novoValorAcumulado,
      qtd_reunioes: qtdReunioes,
      updated_at: new Date().toISOString(),
    });
    
    this.logger.log(`✅ [METAS] Meta salva. Total de metas: ${this.metasMap.size}. Valor acumulado: R$ ${novoValorAcumulado}`);
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
   * Incrementa a contagem de reuniões de um vendedor
   * Chamado quando um closer define um deal como "agora"
   */
  incrementarReunioes(vendedorId: string): void {
    const meta = this.metasMap.get(vendedorId);
    if (meta) {
      meta.qtd_reunioes = (meta.qtd_reunioes || 0) + 1;
      meta.updated_at = new Date().toISOString();
      this.logger.log(`📞 [METAS] Contagem de reuniões incrementada para ${meta.vendedor_nome}: ${meta.qtd_reunioes}`);
    } else {
      this.logger.warn(`⚠️ [METAS] Tentativa de incrementar reuniões para vendedor ${vendedorId} que não possui meta cadastrada`);
    }
  }

  /**
   * Atualiza a quantidade de agendamentos (reuniões) de um SDR
   * Usado para sincronizar com agendamentos do CRM
   */
  atualizarAgendamentos(vendedorId: string, quantidade: number): void {
    const meta = this.metasMap.get(vendedorId);
    if (meta) {
      meta.qtd_reunioes = quantidade;
      meta.updated_at = new Date().toISOString();
      this.logger.log(`📅 [METAS] Agendamentos atualizados para ${meta.vendedor_nome}: ${quantidade}`);
    } else {
      this.logger.warn(`⚠️ [METAS] Tentativa de atualizar agendamentos para vendedor ${vendedorId} que não possui meta cadastrada`);
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
