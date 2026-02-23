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
