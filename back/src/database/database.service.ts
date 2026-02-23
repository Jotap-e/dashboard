import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private readonly envPath = path.join(process.cwd(), '.env');

  /**
   * Lê uma variável do arquivo .env
   */
  private getEnvValue(key: string): string | null {
    try {
      const envContent = fs.readFileSync(this.envPath, 'utf-8');
      // Buscar linha que começa com a chave, suportando espaços antes e depois do =
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        // Ignorar comentários e linhas vazias
        if (trimmedLine.startsWith('#') || !trimmedLine.includes('=')) {
          continue;
        }
        const [envKey, ...valueParts] = trimmedLine.split('=');
        if (envKey.trim() === key) {
          const value = valueParts.join('=').trim();
          // Remover aspas se existirem
          return value.replace(/^["']|["']$/g, '');
        }
      }
      return null;
    } catch (error) {
      this.logger.error(`Erro ao ler ${key} do .env:`, error);
      return null;
    }
  }

  /**
   * Obtém a URI de conexão do MongoDB
   */
  private getMongoUri(): string {
    const uri = this.getEnvValue('MONGODB_URI') || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI não encontrada no arquivo .env ou variáveis de ambiente');
    }
    return uri;
  }

  /**
   * Obtém o nome do banco de dados
   */
  private getDatabaseName(): string {
    const dbName = this.getEnvValue('MONGODB_DATABASE_NAME') || process.env.MONGODB_DATABASE_NAME || 'advhub';
    return dbName;
  }

  /**
   * Conecta ao MongoDB quando o módulo é inicializado
   */
  async onModuleInit() {
    try {
      const uri = this.getMongoUri();
      const dbName = this.getDatabaseName();

      this.logger.log(`Conectando ao MongoDB...`);
      this.logger.log(`Database: ${dbName}`);

      const options: MongoClientOptions = {
        appName: 'AdvHub',
        serverSelectionTimeoutMS: 5000, // Timeout de 5 segundos
        connectTimeoutMS: 5000,
      };

      this.client = new MongoClient(uri, options);
      await this.client.connect();

      this.db = this.client.db(dbName);

      // Testar conexão
      await this.db.admin().ping();
      
      this.logger.log('✅ Conectado ao MongoDB com sucesso');
    } catch (error) {
      this.logger.error('❌ Erro ao conectar ao MongoDB:', error);
      this.logger.warn('⚠️ Backend continuará funcionando sem MongoDB (apenas APIs do RD Station)');
      // Não lançar erro - permitir que o backend funcione sem MongoDB
      this.client = null;
      this.db = null;
    }
  }

  /**
   * Fecha a conexão quando o módulo é destruído
   */
  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
      this.logger.log('Conexão com MongoDB fechada');
    }
  }

  /**
   * Retorna a instância do banco de dados
   */
  getDatabase(): Db | null {
    if (!this.db) {
      this.logger.warn('⚠️ Database não está conectado. Retornando null.');
      return null;
    }
    return this.db;
  }

  /**
   * Retorna a instância do cliente MongoDB
   */
  getClient(): MongoClient | null {
    if (!this.client) {
      this.logger.warn('⚠️ MongoClient não está conectado. Retornando null.');
      return null;
    }
    return this.client;
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }
}
