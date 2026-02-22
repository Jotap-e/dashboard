import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RdTokenService {
  private readonly logger = new Logger(RdTokenService.name);
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
   * Atualiza uma variável no arquivo .env
   */
  private updateEnvValue(key: string, value: string): void {
    try {
      let envContent = fs.readFileSync(this.envPath, 'utf-8');
      
      if (envContent.includes(`${key}=`)) {
        envContent = envContent.replace(
          new RegExp(`${key}=.*`, 'g'),
          `${key}=${value}`
        );
      } else {
        envContent += `\n${key}=${value}`;
      }

      fs.writeFileSync(this.envPath, envContent, 'utf-8');
      this.logger.log(`✅ ${key} atualizado no .env`);
    } catch (error) {
      this.logger.error(`Erro ao atualizar ${key} no .env:`, error);
      throw error;
    }
  }

  /**
   * Faz requisição HTTPS para a API do RD Station
   */
  private makeHttpsRequest(options: https.RequestOptions, body: string): Promise<any> {
    return new Promise((resolve, reject) => {
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
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(new Error(`Erro ao parsear resposta: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Atualiza o token usando refresh_token
   */
  async refreshToken(): Promise<void> {
    this.logger.log('🔄 Iniciando refresh do token RD Station...');

    const clientId = this.getEnvValue('RD_CLIENT_ID');
    const clientSecret = this.getEnvValue('RD_CLIENT_SECRET');
    const refreshToken = this.getEnvValue('RD_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
      this.logger.error('❌ Valores faltando no .env (RD_CLIENT_ID, RD_CLIENT_SECRET ou RD_REFRESH_TOKEN)');
      return;
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString();

    const options: https.RequestOptions = {
      hostname: 'api.rd.services',
      port: 443,
      path: '/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    try {
      const response = await this.makeHttpsRequest(options, body);

      if (response.error) {
        this.logger.error(`❌ Erro da API: ${response.error} - ${response.error_description}`);
        return;
      }

      const newAccessToken = response.access_token;
      const newRefreshToken = response.refresh_token;

      if (!newAccessToken || !newRefreshToken) {
        this.logger.error('❌ Tokens não recebidos na resposta');
        return;
      }

      // Atualiza os tokens no .env
      this.updateEnvValue('RD_ACCESS_TOKEN', newAccessToken);
      this.updateEnvValue('RD_REFRESH_TOKEN', newRefreshToken);

      this.logger.log('✅ Token atualizado com sucesso!');
      this.logger.log(`   Access Token: ${newAccessToken.substring(0, 20)}...`);
      this.logger.log(`   Refresh Token: ${newRefreshToken.substring(0, 20)}...`);
      this.logger.log(`   Timestamp: ${new Date().toISOString()}`);
    } catch (error) {
      this.logger.error('❌ Erro ao fazer refresh do token:', error);
    }
  }
}
