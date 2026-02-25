import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

export interface ContactResponse {
  data: Contact;
}

export interface Contact {
  id: string;
  name: string;
  job_title?: string;
  emails?: Array<{
    email: string;
  }>;
  phones?: Array<{
    phone: string;
    type: 'work' | 'mobile' | 'home' | 'other';
  }>;
  birthday?: string;
  social_profiles?: Array<{
    type: string;
    username: string;
  }>;
  organization_id?: string;
  legal_bases?: Array<{
    category: string;
    type: string;
    status: string;
  }>;
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
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);
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
   * Faz requisição HTTPS PUT para a API do RD Station
   */
  private makeHttpsPutRequest(url: string, accessToken: string, body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const bodyString = JSON.stringify(body);
      
      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'PUT',
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
   * Busca um contato pelo ID
   */
  async getContactById(contactId: string): Promise<Contact> {
    const accessToken = this.getEnvValue('RD_ACCESS_TOKEN');
    
    if (!accessToken) {
      throw new Error('RD_ACCESS_TOKEN não configurado no .env');
    }

    if (!contactId || contactId.trim() === '') {
      throw new Error('contactId é obrigatório');
    }

    const url = `https://api.rd.services/crm/v2/contacts/${contactId}`;
    
    try {
      this.logger.log(`📞 Buscando contato: ${contactId}`);
      const response = await this.makeHttpsGetRequest(url, accessToken);
      return response.data;
    } catch (error: any) {
      if (error.statusCode === 404) {
        this.logger.warn(`⚠️ Contato não encontrado: ${contactId}`);
        throw new Error(`Contato não encontrado: ${contactId}`);
      }
      if (error.statusCode === 401) {
        this.logger.error('❌ Token de acesso inválido ou expirado');
        throw new Error('Token de acesso inválido ou expirado');
      }
      if (error.statusCode === 403) {
        this.logger.error('❌ Sem permissão para acessar este recurso');
        throw new Error('Sem permissão para acessar este recurso');
      }
      if (error.statusCode === 429) {
        this.logger.error('❌ Limite de requisições excedido');
        throw new Error('Limite de requisições excedido');
      }
      this.logger.error(`❌ Erro ao buscar contato ${contactId}:`, error);
      throw new Error(`Erro ao buscar contato: ${error.response?.errors?.[0]?.detail || error.message}`);
    }
  }

  /**
   * Atualiza um contato no RD Station
   * @param contactId ID do contato a ser atualizado
   * @param updateData Dados para atualizar o contato
   */
  async updateContact(contactId: string, updateData: Partial<Contact>): Promise<Contact> {
    this.logger.log(`🔄 Atualizando contato ${contactId} com dados:`, updateData);

    // Validar contactId
    if (!contactId || typeof contactId !== 'string' || contactId.trim() === '') {
      this.logger.error('❌ contactId inválido:', contactId);
      throw {
        statusCode: 400,
        message: 'contact_id é obrigatório e deve ser uma string válida',
        errors: [{ detail: 'contact_id é obrigatório e deve ser uma string válida' }],
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

    // Construir URL para atualizar contato
    const baseUrl = 'https://api.rd.services/crm/v2/contacts';
    const url = `${baseUrl}/${contactId}`;

    // Envolver os dados no formato esperado pelo RD Station: { data: { ... } }
    const rdStationPayload = {
      data: updateData,
    };

    try {
      this.logger.log(`📡 Fazendo requisição PUT para: ${url}`);
      this.logger.log(`📦 Payload para RD Station:`, JSON.stringify(rdStationPayload, null, 2));
      const response = await this.makeHttpsPutRequest(url, accessToken, rdStationPayload);
      
      // A resposta pode vir como { data: Contact } ou diretamente como Contact
      const updatedContact = response.data || response;
      
      if (!updatedContact || !updatedContact.id) {
        throw {
          statusCode: 404,
          message: 'Contato não encontrado ou atualização falhou',
          errors: [{ detail: `Contato com ID ${contactId} não encontrado ou atualização falhou` }],
        };
      }

      this.logger.log(`✅ Contato ${contactId} atualizado com sucesso`);
      return updatedContact as Contact;
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
      const errorMessage = error.message || 'Erro desconhecido ao atualizar contato';
      this.logger.error('❌ Erro ao atualizar contato:', {
        message: errorMessage,
        stack: error.stack,
        error,
      });
      throw new Error(`Erro ao conectar com a API RD Station: ${errorMessage}`);
    }
  }

  /**
   * Extrai o telefone de um contato
   * Prioriza telefone do tipo 'mobile', depois 'work', depois qualquer outro
   */
  extractPhone(contact: Contact): string | null {
    if (!contact.phones || contact.phones.length === 0) {
      return null;
    }

    // Priorizar mobile
    const mobilePhone = contact.phones.find(p => p.type === 'mobile');
    if (mobilePhone) {
      return mobilePhone.phone;
    }

    // Depois work
    const workPhone = contact.phones.find(p => p.type === 'work');
    if (workPhone) {
      return workPhone.phone;
    }

    // Por último, qualquer telefone
    return contact.phones[0].phone;
  }
}
