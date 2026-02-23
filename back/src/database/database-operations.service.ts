import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ForecastDocument } from './schemas/forecast.schema';
import { VendaDocument } from './schemas/vendas.schema';
import { ReuniaoDocument } from './schemas/reunioes.schema';
import { Forecast } from '../websocket/forecasts-state.service';

@Injectable()
export class DatabaseOperationsService {
  private readonly logger = new Logger(DatabaseOperationsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Salva um forecast no banco de dados
   */
  async saveForecast(forecast: Forecast): Promise<void> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, forecast não será salvo no banco');
      return;
    }

    try {
      const forecastDoc: ForecastDocument = {
        id: forecast.id,
        vendedorId: forecast.vendedorId,
        vendedorNome: forecast.vendedorNome,
        clienteNome: forecast.clienteNome,
        clienteNumero: forecast.clienteNumero,
        data: forecast.data,
        horario: forecast.horario,
        valor: forecast.valor,
        observacoes: forecast.observacoes,
        primeiraCall: forecast.primeiraCall,
        negociacaoId: forecast.negociacaoId,
        createdAt: forecast.createdAt,
        updatedAt: forecast.updatedAt,
        savedAt: new Date().toISOString(),
      };

      const collection = db.collection<ForecastDocument>('forecasts');
      
      // Verificar se já existe um forecast com o mesmo ID
      const existing = await collection.findOne({ id: forecast.id });
      
      if (existing) {
        // Atualizar forecast existente
        await collection.updateOne(
          { id: forecast.id },
          { $set: forecastDoc }
        );
        this.logger.log(`✅ Forecast atualizado no banco: ${forecast.id}`);
      } else {
        // Inserir novo forecast
        await collection.insertOne(forecastDoc);
        this.logger.log(`✅ Forecast salvo no banco: ${forecast.id}`);
      }
    } catch (error) {
      this.logger.error(`❌ Erro ao salvar forecast no banco: ${forecast.id}`, error);
      throw error;
    }
  }

  /**
   * Salva uma venda (valor acumulado) no banco de dados
   */
  async saveVenda(
    vendedorId: string,
    vendedorNome: string,
    negociacaoId: string,
    valorNegociacao: number,
    valorAcumuladoVendedor: number,
    valorAcumuladoTime: number,
  ): Promise<void> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, venda não será salva no banco');
      return;
    }

    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      const vendaDoc: VendaDocument = {
        vendedorId,
        vendedorNome,
        data: hoje,
        valorAcumulado: valorAcumuladoVendedor,
        valorTime: valorAcumuladoTime,
        negociacaoId,
        valorNegociacao,
        createdAt: new Date().toISOString(),
      };

      const collection = db.collection<VendaDocument>('vendas');
      await collection.insertOne(vendaDoc);
      
      this.logger.log(`✅ Venda salva no banco: Vendedor ${vendedorNome} - Valor: R$ ${valorNegociacao.toFixed(2)}`);
    } catch (error) {
      this.logger.error(`❌ Erro ao salvar venda no banco: ${vendedorNome}`, error);
      throw error;
    }
  }

  /**
   * Salva uma reunião (marcação como "now") no banco de dados
   */
  async saveReuniao(
    vendedorId: string,
    vendedorNome: string,
    negociacaoId: string,
    clienteNome: string,
    totalReunioesVendedor: number,
    totalReunioesTime: number,
  ): Promise<void> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, reunião não será salva no banco');
      return;
    }

    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      const reuniaoDoc: ReuniaoDocument = {
        vendedorId,
        vendedorNome,
        data: hoje,
        negociacaoId,
        clienteNome,
        totalReunioesVendedor,
        totalReunioesTime,
        createdAt: new Date().toISOString(),
      };

      const collection = db.collection<ReuniaoDocument>('reunioes');
      await collection.insertOne(reuniaoDoc);
      
      this.logger.log(`✅ Reunião salva no banco: Vendedor ${vendedorNome} - Cliente: ${clienteNome}`);
    } catch (error) {
      this.logger.error(`❌ Erro ao salvar reunião no banco: ${vendedorNome}`, error);
      throw error;
    }
  }

  /**
   * Busca forecasts de um vendedor para uma data específica
   */
  async getForecastsByVendedorAndDate(
    vendedorId: string,
    data: string,
  ): Promise<ForecastDocument[]> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, não é possível buscar forecasts');
      return [];
    }

    try {
      const collection = db.collection<ForecastDocument>('forecasts');
      const forecasts = await collection
        .find({ vendedorId, data })
        .sort({ createdAt: -1 })
        .toArray();
      
      return forecasts;
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar forecasts: ${vendedorId} - ${data}`, error);
      return [];
    }
  }

  /**
   * Busca vendas de um vendedor para uma data específica
   */
  async getVendasByVendedorAndDate(
    vendedorId: string,
    data: string,
  ): Promise<VendaDocument[]> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, não é possível buscar vendas');
      return [];
    }

    try {
      const collection = db.collection<VendaDocument>('vendas');
      const vendas = await collection
        .find({ vendedorId, data })
        .sort({ createdAt: -1 })
        .toArray();
      
      return vendas;
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar vendas: ${vendedorId} - ${data}`, error);
      return [];
    }
  }

  /**
   * Busca reuniões de um vendedor para uma data específica
   */
  async getReunioesByVendedorAndDate(
    vendedorId: string,
    data: string,
  ): Promise<ReuniaoDocument[]> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, não é possível buscar reuniões');
      return [];
    }

    try {
      const collection = db.collection<ReuniaoDocument>('reunioes');
      const reunioes = await collection
        .find({ vendedorId, data })
        .sort({ createdAt: -1 })
        .toArray();
      
      return reunioes;
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar reuniões: ${vendedorId} - ${data}`, error);
      return [];
    }
  }
}
