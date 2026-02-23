import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
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
   * Obtém o nome do vendedor pelo ID (owner_id do RD Station)
   */
  getVendedorNomeById(vendedorId: string): string {
    const idToName: Record<string, string> = {
      '6936c37038809600166ca22a': 'João Vitor Martins Ribeiro',
      '6924898ebc81ed0013af4f98': 'Pedro',
      '69824580b58d7a00132a276c': 'Thalia Batista',
      '69330c5c687733001309154c': 'Vinicius Oliveira',
      '6978eabe122529001e60f427': 'Yuri Rafael dos Santos',
      '6977ff083826b100179751c5': 'Gabriel',
      '6936c73f7f78ac001e4278e0': 'Rafael Ratão',
    };
    if (idToName[vendedorId]) return idToName[vendedorId];
    try {
      const envPath = path.join(process.cwd(), '.env');
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const [key, ...valParts] = trimmed.split('=');
        const value = valParts.join('=').trim();
        if (value === vendedorId) {
          const name = key.replace(/^(CLOSER_|SDR_)_?/, '').replace(/_ID$/, '').replace(/_/g, ' ');
          return name.split(' ').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
        }
      }
    } catch (err) {
      this.logger.warn(`⚠️ Erro ao obter nome do vendedor ${vendedorId}`);
    }
    return 'Vendedor';
  }

  /**
   * Salva um forecast no banco de dados.
   * @returns true se salvo com sucesso, false se MongoDB não está conectado
   */
  async saveForecast(forecast: Forecast & { dataCriacao?: string; horaCriacao?: string; closerNome?: string }): Promise<boolean> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, forecast não será salvo no banco');
      return false;
    }

    try {
      const created = forecast.createdAt ? new Date(forecast.createdAt) : new Date();
      const dataCriacao = forecast.dataCriacao ?? created.toISOString().split('T')[0];
      const horaCriacao = forecast.horaCriacao ?? created.toTimeString().slice(0, 8);
      const closerNome = forecast.closerNome ?? '';

      const forecastDoc: ForecastDocument = {
        id: forecast.id,
        vendedorId: forecast.vendedorId,
        closerNome,
        clienteNome: forecast.clienteNome,
        clienteNumero: forecast.clienteNumero,
        data: forecast.data,
        horario: forecast.horario,
        valor: forecast.valor,
        observacoes: forecast.observacoes,
        primeiraCall: forecast.primeiraCall,
        negociacaoId: forecast.negociacaoId,
        dataCriacao,
        horaCriacao,
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
      return true;
    } catch (error) {
      this.logger.error(`❌ Erro ao salvar forecast no banco: ${forecast.id}`, error);
      throw error;
    }
  }

  /**
   * Remove um forecast do banco de dados.
   * @returns true se removido com sucesso, false se MongoDB não está conectado
   */
  async deleteForecast(forecastId: string): Promise<boolean> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, forecast não será removido do banco');
      return false;
    }

    try {
      const collection = db.collection<ForecastDocument>('forecasts');
      const result = await collection.deleteOne({ id: forecastId });
      if (result.deletedCount > 0) {
        this.logger.log(`✅ Forecast removido do banco: ${forecastId}`);
        return true;
      }
      this.logger.warn(`⚠️ Forecast não encontrado no banco: ${forecastId}`);
      return true; // Considera sucesso se não existia
    } catch (error) {
      this.logger.error(`❌ Erro ao remover forecast do banco: ${forecastId}`, error);
      throw error;
    }
  }

  /**
   * Salva uma venda no banco de dados (apenas dados do closer).
   * Valor do time = somatório após GET de vendas.
   * @returns true se salvo com sucesso, false se MongoDB não está conectado
   */
  async saveVenda(
    vendedorId: string,
    vendedorNome: string,
    negociacaoId: string,
    valorNegociacao: number,
    clienteNumero?: string,
  ): Promise<boolean> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, venda não será salva no banco');
      return false;
    }

    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      const vendaDoc: VendaDocument = {
        vendedorId,
        vendedorNome,
        data: hoje,
        negociacaoId,
        valorNegociacao,
        clienteNumero: clienteNumero?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      const collection = db.collection<VendaDocument>('vendas');
      await collection.insertOne(vendaDoc);
      
      this.logger.log(`✅ Venda salva no banco: Vendedor ${vendedorNome} - Valor: R$ ${valorNegociacao.toFixed(2)}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erro ao salvar venda no banco: ${vendedorNome}`, error);
      throw error;
    }
  }

  /**
   * Remove uma venda do banco (reverter venda).
   * Remove a venda mais recente com negociacaoId + vendedorId na data informada.
   * @returns true se removido com sucesso, false se MongoDB não está conectado
   */
  async deleteVenda(negociacaoId: string, vendedorId: string, data?: string): Promise<boolean> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, venda não será removida do banco');
      return false;
    }

    try {
      const dataFiltro = data ?? new Date().toISOString().split('T')[0];
      const collection = db.collection<VendaDocument>('vendas');
      const result = await collection.deleteOne({
        negociacaoId,
        vendedorId,
        data: dataFiltro,
      });
      if (result.deletedCount > 0) {
        this.logger.log(`✅ Venda revertida no banco: negociacao ${negociacaoId} - vendedor ${vendedorId}`);
        return true;
      }
      this.logger.warn(`⚠️ Venda não encontrada no banco: negociacao ${negociacaoId} - vendedor ${vendedorId}`);
      return true; // Considera sucesso se não existia
    } catch (error) {
      this.logger.error(`❌ Erro ao remover venda do banco: ${negociacaoId}`, error);
      throw error;
    }
  }

  /**
   * Salva uma reunião (marcação como "now") no banco de dados.
   * Contagem: use getReunioesByVendedorAndDate → quantidade = array.length
   */
  async saveReuniao(
    vendedorId: string,
    vendedorNome: string,
    negociacaoId: string,
    clienteNome: string,
    clienteNumero?: string,
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
        clienteNumero,
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
   * Busca todos os forecasts de uma data (para sincronizar estado WebSocket com banco).
   */
  async getForecastsByDate(dataCriacao: string): Promise<ForecastDocument[]> {
    const db = this.databaseService.getDatabase();
    if (!db) return [];

    try {
      const collection = db.collection<ForecastDocument>('forecasts');
      return await collection
        .find({ dataCriacao })
        .sort({ createdAt: -1 })
        .toArray();
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar forecasts por data: ${dataCriacao}`, error);
      return [];
    }
  }

  /**
   * Busca forecasts filtrados por nome do closer e data de criação.
   * Permite exibir os forecasts do dia para um closer específico.
   * @param closerNome - Nome do closer (ou vendedorNome)
   * @param dataCriacao - Data de criação YYYY-MM-DD (default: hoje)
   */
  async getForecasts(closerNome: string, dataCriacao?: string): Promise<ForecastDocument[]> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, não é possível buscar forecasts');
      return [];
    }

    try {
      const data = dataCriacao ?? new Date().toISOString().split('T')[0];
      const collection = db.collection<ForecastDocument>('forecasts');
      // Filtra por closerNome
      const forecasts = await collection
        .find({ dataCriacao: data, closerNome })
        .sort({ createdAt: -1 })
        .toArray();
      
      return forecasts;
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar forecasts: ${closerNome} - ${dataCriacao}`, error);
      return [];
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
   * Busca vendas para uma data, opcionalmente filtradas por vendedor.
   * Valor do time = somatório de valorNegociacao das vendas retornadas.
   */
  async getVendas(data: string, vendedorId?: string): Promise<VendaDocument[]> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, não é possível buscar vendas');
      return [];
    }

    try {
      const filter: Record<string, string> = { data };
      if (vendedorId) filter.vendedorId = vendedorId;

      const collection = db.collection<VendaDocument>('vendas');
      const vendas = await collection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();
      
      return vendas;
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar vendas: ${data}`, error);
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
    return this.getVendas(data, vendedorId);
  }

  /**
   * Busca reuniões cuja data de criação (createdAt) coincide com o dia informado.
   * Contagem: quantidade de registros retornados.
   */
  async getReunioesByDate(dataCriacao: string): Promise<ReuniaoDocument[]> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, não é possível buscar reuniões');
      return [];
    }

    try {
      const collection = db.collection<ReuniaoDocument>('reunioes');
      // Filtrar por data de criação (createdAt) = dataCriacao (YYYY-MM-DD)
      const filter = { createdAt: new RegExp(`^${dataCriacao}`) };
      const reunioes = await collection
        .find(filter)
        .sort({ vendedorNome: 1, createdAt: -1 })
        .toArray();

      return reunioes;
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar reuniões por data de criação: ${dataCriacao}`, error);
      return [];
    }
  }

  /**
   * Cria uma reunião manual (call) preenchendo dados do cliente.
   * Usado quando não há negociação no CRM.
   */
  async createReuniaoManual(
    vendedorId: string,
    vendedorNome: string,
    data: string,
    clienteNome: string,
    clienteNumero?: string,
  ): Promise<ReuniaoDocument | null> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, reunião manual não será salva');
      return null;
    }

    try {
      const collection = db.collection<ReuniaoDocument>('reunioes');

      const reuniaoDoc: ReuniaoDocument = {
        vendedorId,
        vendedorNome,
        data,
        negociacaoId: 'manual',
        clienteNome: clienteNome.trim(),
        clienteNumero: clienteNumero?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      const result = await collection.insertOne(reuniaoDoc as ReuniaoDocument & { _id?: unknown });
      const inserted: ReuniaoDocument = {
        ...reuniaoDoc,
        _id: result.insertedId ? String(result.insertedId) : undefined,
      };

      this.logger.log(`✅ Reunião manual criada: ${vendedorNome} - Cliente: ${clienteNome}`);
      return inserted;
    } catch (error) {
      this.logger.error(`❌ Erro ao criar reunião manual: ${vendedorNome}`, error);
      throw error;
    }
  }

  /**
   * Busca reuniões de um vendedor cuja data de criação (createdAt) coincide com o dia informado.
   * Contagem: quantidade de registros retornados.
   */
  async getReunioesByVendedorAndDate(
    vendedorId: string,
    dataCriacao: string,
  ): Promise<ReuniaoDocument[]> {
    const db = this.databaseService.getDatabase();
    if (!db) {
      this.logger.warn('⚠️ MongoDB não conectado, não é possível buscar reuniões');
      return [];
    }

    try {
      const collection = db.collection<ReuniaoDocument>('reunioes');
      const filter = {
        vendedorId,
        createdAt: new RegExp(`^${dataCriacao}`),
      };
      const reunioes = await collection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();

      return reunioes;
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar reuniões: ${vendedorId} - ${dataCriacao}`, error);
      return [];
    }
  }
}
