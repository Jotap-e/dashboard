import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

export interface DealResponse {
  data: Deal[];
  links: {
    first?: string;
    prev?: string;
    self?: string;
    next?: string;
    last?: string;
  };
}

export interface Deal {
  id: string;
  name: string;
  recurrence_price: number;
  one_time_price: number;
  total_price: number;
  expected_close_date?: string;
  rating: number;
  status: string;
  closed_at?: string;
  pipeline_id?: string;
  stage_id?: string;
  owner_id?: string;
  source_id?: string;
  campaign_id?: string;
  lost_reason_id?: string;
  organization_id?: string;
  contact_ids?: string[];
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface ErrorResponse {
  errors: Array<{
    detail: string;
  }>;
}

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);
  private readonly envPath = path.join(process.cwd(), '.env');

  /**
   * Lê uma variável do arquivo .env
   */
  private getEnvValue(key: string): string | null {
    try {
      const envContent = fs.readFileSync(this.envPath, 'utf-8');
      const match = envContent.match(new RegExp(`${key}=(.+)`));
      return match?.[1]?.trim() || null;
    } catch (error) {
      this.logger.error(`Erro ao ler ${key} do .env:`, error);
      return null;
    }
  }

  /**
   * Faz requisição HTTPS PATCH para a API do RD Station
   */
  private makeHttpsPatchRequest(url: string, accessToken: string, body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const bodyString = JSON.stringify(body);
      
      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'content-length': Buffer.byteLength(bodyString),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              reject({
                statusCode: res.statusCode,
                response: response as ErrorResponse,
              });
            }
          } catch (error) {
            reject(new Error(`Erro ao parsear resposta: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(bodyString);
      req.end();
    });
  }

  /**
   * Faz requisição HTTPS GET para a API do RD Station
   */
  private makeHttpsGetRequest(url: string, accessToken: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${accessToken}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              // Para erros 400, 401, 403, 500
              reject({
                statusCode: res.statusCode,
                response: response as ErrorResponse,
              });
            }
          } catch (error) {
            reject(new Error(`Erro ao parsear resposta: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  /**
   * Busca todas as negociações (deals) do RD Station (sem filtro)
   * @param pageNumber Número da página (padrão: 1)
   * @param pageSize Tamanho da página (padrão: 25)
   */
  async getAllDeals(pageNumber: number = 1, pageSize: number = 25): Promise<DealResponse> {
    this.logger.log(`🔍 Buscando todas as negociações (página ${pageNumber}, tamanho ${pageSize})`);

    const accessToken = this.getEnvValue('RD_ACCESS_TOKEN');

    if (!accessToken) {
      this.logger.error('❌ RD_ACCESS_TOKEN não encontrado no .env');
      throw new Error('Token de acesso não configurado');
    }

    // Construir URL com paginação
    const baseUrl = 'https://api.rd.services/crm/v2/deals';
    const url = `${baseUrl}?page[number]=${pageNumber}&page[size]=${pageSize}`;

    try {
      this.logger.log(`📡 Fazendo requisição para: ${url}`);
      const response = await this.makeHttpsGetRequest(url, accessToken);
      this.logger.log(`✅ ${response.data?.length || 0} negociações encontradas`);
      return response as DealResponse;
    } catch (error: any) {
      if (error.statusCode) {
        const errorMessage = error.response?.errors?.[0]?.detail || 'Erro desconhecido da API';
        this.logger.error(`❌ Erro da API RD Station (${error.statusCode}):`, {
          statusCode: error.statusCode,
          message: errorMessage,
          response: error.response,
        });
        throw {
          statusCode: error.statusCode,
          message: errorMessage,
          errors: error.response?.errors || [{ detail: errorMessage }],
        };
      }
      // Erro de rede ou outro erro não tratado
      const errorMessage = error.message || 'Erro desconhecido ao buscar negociações';
      this.logger.error('❌ Erro ao buscar negociações:', {
        message: errorMessage,
        stack: error.stack,
        error,
      });
      throw new Error(`Erro ao conectar com a API RD Station: ${errorMessage}`);
    }
  }

  /**
   * Busca negociações (deals) do RD Station filtradas por vendedor
   * @param ownerId ID do vendedor
   * @param pageNumber Número da página (padrão: 1)
   * @param pageSize Tamanho da página (padrão: 25)
   */
  async getDealsByOwner(ownerId: string, pageNumber: number = 1, pageSize: number = 25): Promise<DealResponse> {
    // Validar ownerId
    if (!ownerId || typeof ownerId !== 'string' || ownerId.trim() === '') {
      this.logger.error('❌ ownerId inválido:', ownerId);
      throw {
        statusCode: 400,
        message: 'owner_id é obrigatório e deve ser uma string válida',
        errors: [{ detail: 'owner_id é obrigatório e deve ser uma string válida' }],
      };
    }

    // Validar paginação
    if (pageNumber < 1) {
      pageNumber = 1;
    }
    if (pageSize < 1 || pageSize > 100) {
      pageSize = 25;
    }

    this.logger.log(`🔍 Buscando negociações para o vendedor: ${ownerId} (página ${pageNumber}, tamanho ${pageSize})`);

    const accessToken = this.getEnvValue('RD_ACCESS_TOKEN');

    if (!accessToken) {
      this.logger.error('❌ RD_ACCESS_TOKEN não encontrado no .env');
      throw {
        statusCode: 500,
        message: 'Token de acesso não configurado',
        errors: [{ detail: 'Token de acesso não configurado' }],
      };
    }

    // Construir URL com filtro e paginação
    // Formato: ?filter=owner_id:<id do vendedor>&page[number]=1&page[size]=25
    const baseUrl = 'https://api.rd.services/crm/v2/deals';
    const cleanOwnerId = ownerId.trim();
    const url = `${baseUrl}?filter=owner_id:${encodeURIComponent(cleanOwnerId)}&page[number]=${pageNumber}&page[size]=${pageSize}`;

    try {
      this.logger.log(`📡 Fazendo requisição para: ${url}`);
      const response = await this.makeHttpsGetRequest(url, accessToken);
      this.logger.log(`✅ ${response.data?.length || 0} negociações encontradas`);
      return response as DealResponse;
    } catch (error: any) {
      if (error.statusCode) {
        const errorMessage = error.response?.errors?.[0]?.detail || 'Erro desconhecido da API';
        this.logger.error(`❌ Erro da API RD Station (${error.statusCode}):`, {
          statusCode: error.statusCode,
          message: errorMessage,
          response: error.response,
        });
        throw {
          statusCode: error.statusCode,
          message: errorMessage,
          errors: error.response?.errors || [{ detail: errorMessage }],
        };
      }
      // Erro de rede ou outro erro não tratado
      const errorMessage = error.message || 'Erro desconhecido ao buscar negociações';
      this.logger.error('❌ Erro ao buscar negociações:', {
        message: errorMessage,
        stack: error.stack,
        error,
      });
      throw new Error(`Erro ao conectar com a API RD Station: ${errorMessage}`);
    }
  }

  /**
   * Busca apenas os IDs dos deals com flag "now" = true
   * Retorna array de IDs para verificação rápida
   */
  async getDealIdsWithNow(): Promise<string[]> {
    this.logger.log('🔍 Buscando IDs de negociações com flag "now" = true');

    const accessToken = this.getEnvValue('RD_ACCESS_TOKEN');

    if (!accessToken) {
      this.logger.error('❌ RD_ACCESS_TOKEN não encontrado no .env');
      throw {
        statusCode: 500,
        message: 'Token de acesso não configurado',
        errors: [{ detail: 'Token de acesso não configurado' }],
      };
    }

    // Buscar todos os deals e filtrar por custom_field "is_now" = true
    const baseUrl = 'https://api.rd.services/crm/v2/deals';
    const url = `${baseUrl}?page[number]=1&page[size]=100`;

    try {
      this.logger.log(`📡 Fazendo requisição para: ${url}`);
      const response = await this.makeHttpsGetRequest(url, accessToken);
      
      // Filtrar deals com custom_field "is_now" = true e retornar apenas os IDs
      const dealIds = (response.data || [])
        .filter((deal: Deal) => {
          return deal.custom_fields?.is_now === true || deal.custom_fields?.is_now === 'true';
        })
        .map((deal: Deal) => deal.id);

      this.logger.log(`✅ ${dealIds.length} IDs de negociações com flag "now" encontrados`);
      
      return dealIds;
    } catch (error: any) {
      if (error.statusCode) {
        const errorMessage = error.response?.errors?.[0]?.detail || 'Erro desconhecido da API';
        this.logger.error(`❌ Erro da API RD Station (${error.statusCode}):`, {
          statusCode: error.statusCode,
          message: errorMessage,
          response: error.response,
        });
        throw {
          statusCode: error.statusCode,
          message: errorMessage,
          errors: error.response?.errors || [{ detail: errorMessage }],
        };
      }
      const errorMessage = error.message || 'Erro desconhecido ao buscar IDs de negociações';
      this.logger.error('❌ Erro ao buscar IDs de negociações:', {
        message: errorMessage,
        stack: error.stack,
        error,
      });
      throw new Error(`Erro ao conectar com a API RD Station: ${errorMessage}`);
    }
  }

  /**
   * Busca negociações (deals) com flag "now" = true
   * Retorna deals que estão marcados como "em andamento agora"
   */
  async getDealsWithNow(): Promise<DealResponse> {
    this.logger.log('🔍 Buscando negociações com flag "now" = true');

    const accessToken = this.getEnvValue('RD_ACCESS_TOKEN');

    if (!accessToken) {
      this.logger.error('❌ RD_ACCESS_TOKEN não encontrado no .env');
      throw {
        statusCode: 500,
        message: 'Token de acesso não configurado',
        errors: [{ detail: 'Token de acesso não configurado' }],
      };
    }

    // Buscar todos os deals e filtrar por custom_field "is_now" = true
    // Nota: A API do RD Station pode não ter filtro direto para custom_fields,
    // então vamos buscar todos e filtrar no código
    const baseUrl = 'https://api.rd.services/crm/v2/deals';
    const url = `${baseUrl}?page[number]=1&page[size]=100`;

    try {
      this.logger.log(`📡 Fazendo requisição para: ${url}`);
      const response = await this.makeHttpsGetRequest(url, accessToken);
      
      // Filtrar deals com custom_field "is_now" = true
      const dealsWithNow = response.data?.filter((deal: Deal) => {
        return deal.custom_fields?.is_now === true || deal.custom_fields?.is_now === 'true';
      }) || [];

      this.logger.log(`✅ ${dealsWithNow.length} negociações com flag "now" encontradas`);
      
      return {
        data: dealsWithNow,
        links: response.links || {},
      } as DealResponse;
    } catch (error: any) {
      if (error.statusCode) {
        const errorMessage = error.response?.errors?.[0]?.detail || 'Erro desconhecido da API';
        this.logger.error(`❌ Erro da API RD Station (${error.statusCode}):`, {
          statusCode: error.statusCode,
          message: errorMessage,
          response: error.response,
        });
        throw {
          statusCode: error.statusCode,
          message: errorMessage,
          errors: error.response?.errors || [{ detail: errorMessage }],
        };
      }
      const errorMessage = error.message || 'Erro desconhecido ao buscar negociações';
      this.logger.error('❌ Erro ao buscar negociações:', {
        message: errorMessage,
        stack: error.stack,
        error,
      });
      throw new Error(`Erro ao conectar com a API RD Station: ${errorMessage}`);
    }
  }

  /**
   * Define um deal como "now" (em andamento agora)
   * Desativa o "now" de todos os deals do mesmo owner e ativa no deal especificado
   * @param dealId ID do deal a ser marcado como "now"
   * @param ownerId ID do owner (vendedor) do deal
   */
  async setDealAsNow(dealId: string, ownerId: string): Promise<Deal> {
    this.logger.log(`🔄 Definindo deal ${dealId} como "now" para owner ${ownerId}`);

    // Validar parâmetros
    if (!dealId || typeof dealId !== 'string' || dealId.trim() === '') {
      throw {
        statusCode: 400,
        message: 'deal_id é obrigatório',
        errors: [{ detail: 'deal_id é obrigatório e deve ser uma string válida' }],
      };
    }

    if (!ownerId || typeof ownerId !== 'string' || ownerId.trim() === '') {
      throw {
        statusCode: 400,
        message: 'owner_id é obrigatório',
        errors: [{ detail: 'owner_id é obrigatório e deve ser uma string válida' }],
      };
    }

    const accessToken = this.getEnvValue('RD_ACCESS_TOKEN');

    if (!accessToken) {
      this.logger.error('❌ RD_ACCESS_TOKEN não encontrado no .env');
      throw {
        statusCode: 500,
        message: 'Token de acesso não configurado',
        errors: [{ detail: 'Token de acesso não configurado' }],
      };
    }

    try {
      // 1. Buscar todos os deals do mesmo owner
      this.logger.log(`📋 Buscando deals do owner ${ownerId} para desativar flag "now"`);
      const allDealsResponse = await this.getDealsByOwner(ownerId, 1, 100);
      const dealsToUpdate = allDealsResponse.data?.filter((deal: Deal) => {
        return deal.custom_fields?.is_now === true || deal.custom_fields?.is_now === 'true';
      }) || [];

      // 2. Desativar "now" em todos os deals do owner
      for (const deal of dealsToUpdate) {
        if (deal.id === dealId) continue; // Pular o deal que será ativado
        
        const updateUrl = `https://api.rd.services/crm/v2/deals/${deal.id}`;
        const updateBody = {
          custom_fields: {
            ...deal.custom_fields,
            is_now: false,
          },
        };

        try {
          this.logger.log(`🔄 Desativando flag "now" no deal ${deal.id}`);
          await this.makeHttpsPatchRequest(updateUrl, accessToken, updateBody);
        } catch (error: any) {
          this.logger.warn(`⚠️ Erro ao desativar flag "now" no deal ${deal.id}:`, error.message);
          // Continuar mesmo se houver erro em um deal
        }
      }

      // 3. Ativar "now" no deal especificado
      // Primeiro, buscar o deal atual para preservar outros custom_fields
      const currentDealUrl = `https://api.rd.services/crm/v2/deals/${dealId}`;
      let currentDeal: Deal;
      
      try {
        const currentDealResponse = await this.makeHttpsGetRequest(currentDealUrl, accessToken);
        // A resposta pode vir como { data: Deal } ou diretamente como Deal
        currentDeal = currentDealResponse.data || currentDealResponse;
        
        // Se ainda não for um Deal válido, tentar acessar diretamente
        if (!currentDeal || !currentDeal.id) {
          currentDeal = currentDealResponse as Deal;
        }
      } catch (error: any) {
        this.logger.error(`❌ Erro ao buscar deal ${dealId}:`, error);
        throw {
          statusCode: error.statusCode || 404,
          message: 'Deal não encontrado',
          errors: [{ detail: `Deal com ID ${dealId} não encontrado` }],
        };
      }

      const targetDealUrl = `https://api.rd.services/crm/v2/deals/${dealId}`;
      const updateBody = {
        custom_fields: {
          ...(currentDeal.custom_fields || {}),
          is_now: true,
        },
      };

      this.logger.log(`✅ Ativando flag "now" no deal ${dealId}`);
      const updatedDealResponse = await this.makeHttpsPatchRequest(targetDealUrl, accessToken, updateBody);
      
      const updatedDeal = updatedDealResponse.data || updatedDealResponse;
      this.logger.log(`✅ Deal ${dealId} marcado como "now" com sucesso`);
      
      return updatedDeal as Deal;
    } catch (error: any) {
      if (error.statusCode) {
        const errorMessage = error.response?.errors?.[0]?.detail || error.message || 'Erro desconhecido da API';
        this.logger.error(`❌ Erro da API RD Station (${error.statusCode}):`, {
          statusCode: error.statusCode,
          message: errorMessage,
          response: error.response,
        });
        throw {
          statusCode: error.statusCode,
          message: errorMessage,
          errors: error.response?.errors || [{ detail: errorMessage }],
        };
      }
      const errorMessage = error.message || 'Erro desconhecido ao atualizar deal';
      this.logger.error('❌ Erro ao atualizar deal:', {
        message: errorMessage,
        stack: error.stack,
        error,
      });
      throw new Error(`Erro ao conectar com a API RD Station: ${errorMessage}`);
    }
  }

  /**
   * Busca uma negociação (deal) específica pelo ID
   * @param dealId ID do deal a ser buscado
   */
  async getDealById(dealId: string): Promise<Deal> {
    this.logger.log(`🔍 Buscando deal com ID: ${dealId}`);

    // Validar dealId
    if (!dealId || typeof dealId !== 'string' || dealId.trim() === '') {
      this.logger.error('❌ dealId inválido:', dealId);
      throw {
        statusCode: 400,
        message: 'deal_id é obrigatório e deve ser uma string válida',
        errors: [{ detail: 'deal_id é obrigatório e deve ser uma string válida' }],
      };
    }

    const accessToken = this.getEnvValue('RD_ACCESS_TOKEN');

    if (!accessToken) {
      this.logger.error('❌ RD_ACCESS_TOKEN não encontrado no .env');
      throw {
        statusCode: 500,
        message: 'Token de acesso não configurado',
        errors: [{ detail: 'Token de acesso não configurado' }],
      };
    }

    // Construir URL para buscar deal específico
    const baseUrl = 'https://api.rd.services/crm/v2/deals';
    const url = `${baseUrl}/${dealId}`;

    try {
      this.logger.log(`📡 Fazendo requisição para: ${url}`);
      const response = await this.makeHttpsGetRequest(url, accessToken);
      
      // A resposta pode vir como { data: Deal } ou diretamente como Deal
      const deal = response.data || response;
      
      if (!deal || !deal.id) {
        throw {
          statusCode: 404,
          message: 'Deal não encontrado',
          errors: [{ detail: `Deal com ID ${dealId} não encontrado` }],
        };
      }

      this.logger.log(`✅ Deal encontrado: ${deal.name || dealId}`);
      return deal as Deal;
    } catch (error: any) {
      if (error.statusCode) {
        const errorMessage = error.response?.errors?.[0]?.detail || error.message || 'Erro desconhecido da API';
        this.logger.error(`❌ Erro da API RD Station (${error.statusCode}):`, {
          statusCode: error.statusCode,
          message: errorMessage,
          response: error.response,
        });
        throw {
          statusCode: error.statusCode,
          message: errorMessage,
          errors: error.response?.errors || [{ detail: errorMessage }],
        };
      }
      const errorMessage = error.message || 'Erro desconhecido ao buscar deal';
      this.logger.error('❌ Erro ao buscar deal:', {
        message: errorMessage,
        stack: error.stack,
        error,
      });
      throw new Error(`Erro ao conectar com a API RD Station: ${errorMessage}`);
    }
  }
}
