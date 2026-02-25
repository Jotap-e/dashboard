import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isShuttingDown = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  /**
   * Resolve o caminho do .env (tenta múltiplas localizações)
   */
  private getEnvPath(): string | null {
    const candidates = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), 'back', '.env'),
      path.resolve(__dirname, '..', '..', '.env'), // dist/database -> back/
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  /**
   * Lê uma variável do arquivo .env
   */
  private getEnvValue(key: string): string | null {
    try {
      const envPath = this.getEnvPath();
      if (!envPath) return null;

      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('#') || !trimmedLine.includes('=')) continue;
        const [envKey, ...valueParts] = trimmedLine.split('=');
        if (envKey.trim() === key) {
          return valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Obtém a URI de conexão do MongoDB (process.env tem prioridade)
   */
  private getMongoUri(): string {
    const uri = process.env.MONGODB_URI || this.getEnvValue('MONGODB_URI');
    if (!uri) {
      throw new Error('MONGODB_URI não encontrada. Configure no .env ou variáveis de ambiente.');
    }
    return uri;
  }

  /**
   * Obtém o nome do banco de dados
   */
  private getDatabaseName(): string {
    return process.env.MONGODB_DATABASE_NAME || this.getEnvValue('MONGODB_DATABASE_NAME') || 'advhub';
  }

  /**
   * Aguarda um tempo em ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Conecta ao MongoDB (usado na inicialização e na reconexão)
   */
  private async connect(): Promise<boolean> {
    try {
      const uri = this.getMongoUri();
      const dbName = this.getDatabaseName();

      const options: MongoClientOptions = {
        appName: 'AdvHub',
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        maxIdleTimeMS: 60000,
      };

      const newClient = new MongoClient(uri, options);
      await newClient.connect();

      const newDb = newClient.db(dbName);
      await newDb.admin().ping();

      // Fechar cliente antigo se existir (reconexão)
      if (this.client) {
        try {
          await this.client.close();
        } catch {}
      }

      this.client = newClient;
      this.db = newDb;

      this.setupConnectionEvents();
      this.logger.log(`✅ Conectado ao MongoDB (database: ${dbName})`);
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erro ao conectar ao MongoDB: ${msg}`);
      return false;
    }
  }

  /**
   * Configura listeners para reconexão automática em caso de perda de conexão
   */
  private setupConnectionEvents(): void {
    if (!this.client) return;

    this.client.on('close', () => {
      if (this.isShuttingDown) return;
      this.logger.warn('⚠️ Conexão com MongoDB fechada. Tentando reconectar em 5s...');
      this.client = null;
      this.db = null;
      this.scheduleReconnect();
    });

    this.client.on('error', (err) => {
      this.logger.warn(`⚠️ Erro na conexão MongoDB: ${err.message}`);
    });
  }

  /**
   * Agenda tentativa de reconexão
   * @param delayMs - delay antes de tentar (5s após close, 30s após falha)
   */
  private scheduleReconnect(delayMs = 5000): void {
    if (this.reconnectTimeout || this.isShuttingDown) return;

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      if (this.isShuttingDown) return;
      this.logger.log('🔄 Tentando reconectar ao MongoDB...');
      const ok = await this.connect();
      if (!ok) {
        this.logger.warn('⚠️ Reconexão falhou. Nova tentativa em 30s...');
        this.scheduleReconnect(30000);
      }
    }, delayMs);
  }

  /**
   * Conecta ao MongoDB quando o módulo é inicializado (com retry)
   */
  async onModuleInit() {
    const envPath = this.getEnvPath();
    const mongoUri = process.env.MONGODB_URI || this.getEnvValue('MONGODB_URI');
    const hasUri = !!mongoUri;
    const dbName = this.getDatabaseName();
    
    this.logger.log(`🔌 Conectando ao MongoDB...`);
    this.logger.log(`   📁 Arquivo .env: ${envPath ?? 'não encontrado'}`);
    this.logger.log(`   🔑 MONGODB_URI: ${hasUri ? 'configurada' : '❌ FALTANDO'}`);
    this.logger.log(`   📊 Database: ${dbName}`);
    
    if (!hasUri) {
      this.logger.error('❌ MONGODB_URI não encontrada! Configure no .env ou variáveis de ambiente.');
      this.logger.error('   Exemplo: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?appName=AdvHub');
      this.client = null;
      this.db = null;
      return;
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      this.logger.log(`🔄 Tentativa ${attempt}/${MAX_RETRIES} de conexão...`);
      const ok = await this.connect();
      if (ok) {
        this.logger.log(`✅ MongoDB conectado com sucesso na tentativa ${attempt}`);
        return;
      }

      if (attempt < MAX_RETRIES) {
        this.logger.warn(`⚠️ Tentativa ${attempt}/${MAX_RETRIES} falhou. Nova tentativa em ${RETRY_DELAY_MS / 1000}s...`);
        await this.sleep(RETRY_DELAY_MS);
      }
    }

    this.logger.error('❌ Não foi possível conectar ao MongoDB após todas as tentativas.');
    this.logger.error('⚠️ Backend continuará sem MongoDB (apenas APIs do RD Station)');
    this.logger.error('💡 Verifique:');
    this.logger.error('   1. Se MONGODB_URI está correta no .env');
    this.logger.error('   2. Se o MongoDB Atlas está acessível');
    this.logger.error('   3. Se o IP está na whitelist do MongoDB Atlas (ou use 0.0.0.0/0 para permitir todos)');
    this.logger.error('   4. Se as credenciais estão corretas');
    this.client = null;
    this.db = null;
  }

  /**
   * Fecha a conexão quando o módulo é destruído
   */
  async onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.client) {
      try {
        await this.client.close();
        this.logger.log('Conexão com MongoDB fechada');
      } catch (err) {
        this.logger.warn('Erro ao fechar conexão MongoDB:', err);
      }
      this.client = null;
      this.db = null;
    }
  }

  /**
   * Retorna a instância do banco de dados
   */
  getDatabase(): Db | null {
    return this.db ?? null;
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

  /**
   * Tenta reconectar ao MongoDB manualmente
   * Útil quando a conexão foi perdida e precisa ser restaurada
   */
  async tryReconnect(): Promise<boolean> {
    if (this.isConnected()) {
      this.logger.log('✅ MongoDB já está conectado');
      return true;
    }

    this.logger.log('🔄 Tentando reconectar ao MongoDB...');
    const success = await this.connect();
    if (success) {
      this.logger.log('✅ Reconexão bem-sucedida');
    } else {
      this.logger.error('❌ Falha na reconexão ao MongoDB');
    }
    return success;
  }
}
