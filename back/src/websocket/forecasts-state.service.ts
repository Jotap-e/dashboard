import { Injectable, Logger } from '@nestjs/common';

export interface Forecast {
  id: string;
  vendedorId: string;
  vendedorNome: string;
  clienteNome: string;
  clienteNumero: string;
  data: string;
  horario: string;
  valor: number;
  observacoes: string;
  primeiraCall: string; // Data da primeira call no formato YYYY-MM-DD
  negociacaoId?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ForecastsStateService {
  private readonly logger = new Logger(ForecastsStateService.name);
  // Map de vendedor_id -> Forecast[]
  private readonly forecastsMap = new Map<string, Forecast[]>();

  /**
   * Adiciona ou atualiza um forecast
   */
  setForecast(forecast: Forecast): void {
    const existing = this.forecastsMap.get(forecast.vendedorId) || [];
    
    // Verificar se já existe um forecast com o mesmo ID
    const index = existing.findIndex(f => f.id === forecast.id);
    
    if (index >= 0) {
      // Atualizar forecast existente
      existing[index] = { ...forecast, updatedAt: new Date().toISOString() };
      this.logger.log(`📝 Forecast atualizado: ${forecast.id} para vendedor ${forecast.vendedorNome}`);
    } else {
      // Adicionar novo forecast
      existing.push(forecast);
      this.logger.log(`➕ Forecast adicionado: ${forecast.id} para vendedor ${forecast.vendedorNome}`);
    }
    
    this.forecastsMap.set(forecast.vendedorId, existing);
  }

  /**
   * Remove um forecast
   */
  removeForecast(forecastId: string, vendedorId: string): void {
    const existing = this.forecastsMap.get(vendedorId) || [];
    const filtered = existing.filter(f => f.id !== forecastId);
    
    if (filtered.length !== existing.length) {
      this.forecastsMap.set(vendedorId, filtered);
      this.logger.log(`🗑️ Forecast removido: ${forecastId} do vendedor ${vendedorId}`);
    }
  }

  /**
   * Obtém todos os forecasts de um vendedor
   */
  getForecastsByVendedor(vendedorId: string): Forecast[] {
    return this.forecastsMap.get(vendedorId) || [];
  }

  /**
   * Obtém todos os forecasts de todos os vendedores
   * Retorna Array<[vendedor_id, Forecast[]]>
   */
  getAllForecasts(): Array<[string, Forecast[]]> {
    return Array.from(this.forecastsMap.entries());
  }

  /**
   * Limpa todos os forecasts de um vendedor
   */
  clearForecastsByVendedor(vendedorId: string): void {
    this.forecastsMap.delete(vendedorId);
    this.logger.log(`🧹 Forecasts limpos para vendedor ${vendedorId}`);
  }

  /**
   * Limpa todos os forecasts
   */
  clearAll(): void {
    this.forecastsMap.clear();
    this.logger.log(`🧹 Todos os forecasts foram limpos`);
  }
}
