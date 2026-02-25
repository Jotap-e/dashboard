import { Injectable, Logger } from '@nestjs/common';

interface DealNowData {
  deal_id: string;
  is_now: boolean;
  updated_at: string;
  owner_id?: string;
  vendedor?: string;
  cliente_nome?: string; // Para deals manuais
  cliente_numero?: string; // Para deals manuais
  valor?: number; // Para deals manuais
}

/**
 * Serviço para gerenciar estado em memória dos deals com flag "now"
 * Mantém os dados mesmo após refresh da página ou reconexão WebSocket
 */
@Injectable()
export class DealsStateService {
  private readonly logger = new Logger(DealsStateService.name);
  
  // Map para armazenar deals com flag "now" (deal_id -> DealNowData)
  private readonly dealsNowMap = new Map<string, DealNowData>();
  
  // Map para armazenar qual deal está marcado como "now" por vendedor (vendedor_id -> deal_id)
  private readonly vendedorNowMap = new Map<string, string>();

  /**
   * Adiciona ou atualiza um deal com flag "now"
   */
  setDealNow(dealId: string, data: DealNowData): void {
    this.logger.log(`💾 [STATE] Salvando deal "now": ${dealId}`);
    
    // Se há um owner_id, atualizar o mapeamento por vendedor
    if (data.owner_id) {
      // Remover deal anterior do mesmo vendedor se existir
      const previousDealId = this.vendedorNowMap.get(data.owner_id);
      if (previousDealId && previousDealId !== dealId) {
        this.logger.log(`🔄 [STATE] Removendo deal anterior do vendedor ${data.owner_id}: ${previousDealId}`);
        this.dealsNowMap.delete(previousDealId);
      }
      
      // Adicionar novo deal ao mapeamento do vendedor
      this.vendedorNowMap.set(data.owner_id, dealId);
    }
    
    // Adicionar/atualizar deal no Map principal
    this.dealsNowMap.set(dealId, data);
    
    this.logger.log(`✅ [STATE] Deal salvo. Total de deals "now": ${this.dealsNowMap.size}`);
  }

  /**
   * Remove um deal do estado (quando is_now = false)
   */
  removeDealNow(dealId: string): void {
    this.logger.log(`🗑️ [STATE] Removendo deal "now": ${dealId}`);
    
    const deal = this.dealsNowMap.get(dealId);
    if (deal && deal.owner_id) {
      // Remover do mapeamento por vendedor
      const currentDealId = this.vendedorNowMap.get(deal.owner_id);
      if (currentDealId === dealId) {
        this.vendedorNowMap.delete(deal.owner_id);
      }
    }
    
    // Remover do Map principal
    this.dealsNowMap.delete(dealId);
    
    this.logger.log(`✅ [STATE] Deal removido. Total de deals "now": ${this.dealsNowMap.size}`);
  }

  /**
   * Obtém todos os deals com flag "now" como array de arrays [deal_id, data]
   * Formato compatível com Map.entries() para serialização
   */
  getAllDealsNow(): Array<[string, DealNowData]> {
    return Array.from(this.dealsNowMap.entries());
  }

  /**
   * Obtém o deal_id marcado como "now" para um vendedor específico
   */
  getVendedorNowDeal(vendedorId: string): string | null {
    return this.vendedorNowMap.get(vendedorId) || null;
  }

  /**
   * Obtém todos os deals "now" por vendedor como Map (vendedor_id -> deal_id)
   */
  getAllVendedorNow(): Array<[string, string]> {
    return Array.from(this.vendedorNowMap.entries());
  }

  /**
   * Limpa todo o estado (útil para testes ou reset)
   */
  clear(): void {
    this.logger.log(`🧹 [STATE] Limpando todo o estado`);
    this.dealsNowMap.clear();
    this.vendedorNowMap.clear();
  }

  /**
   * Obtém estatísticas do estado atual
   */
  getStats(): { dealsNowCount: number; vendedoresCount: number } {
    return {
      dealsNowCount: this.dealsNowMap.size,
      vendedoresCount: this.vendedorNowMap.size,
    };
  }
}
