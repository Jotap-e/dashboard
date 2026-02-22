const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

/**
 * Lê uma variável do arquivo .env
 */
function getEnvValue(key) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(new RegExp(`${key}=(.+)`));
    return match?.[1]?.trim() || null;
  } catch (error) {
    console.error(`Erro ao ler ${key} do .env:`, error);
    return null;
  }
}

/**
 * Atualiza uma variável no arquivo .env
 */
function updateEnvValue(key, value) {
  try {
    let envContent = fs.readFileSync(envPath, 'utf-8');
    
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(
        new RegExp(`${key}=.*`, 'g'),
        `${key}=${value}`
      );
    } else {
      envContent += `\n${key}=${value}`;
    }

    fs.writeFileSync(envPath, envContent, 'utf-8');
    console.log(`✅ ${key} atualizado no .env`);
  } catch (error) {
    console.error(`Erro ao atualizar ${key} no .env:`, error);
    throw error;
  }
}

/**
 * Faz requisição HTTPS para a API do RD Station
 */
function makeHttpsRequest(options, body) {
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
async function refreshToken() {
  console.log('🔄 Iniciando refresh do token RD Station...');

  const clientId = getEnvValue('RD_CLIENT_ID');
  const clientSecret = getEnvValue('RD_CLIENT_SECRET');
  const refreshTokenValue = getEnvValue('RD_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshTokenValue) {
    console.error('❌ Valores faltando no .env (RD_CLIENT_ID, RD_CLIENT_SECRET ou RD_REFRESH_TOKEN)');
    return;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshTokenValue,
    grant_type: 'refresh_token',
  }).toString();

  const options = {
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
    const response = await makeHttpsRequest(options, body);

    if (response.error) {
      console.error(`❌ Erro da API: ${response.error} - ${response.error_description}`);
      return;
    }

    const newAccessToken = response.access_token;
    const newRefreshToken = response.refresh_token;

    if (!newAccessToken || !newRefreshToken) {
      console.error('❌ Tokens não recebidos na resposta');
      return;
    }

    // Atualiza os tokens no .env
    updateEnvValue('RD_ACCESS_TOKEN', newAccessToken);
    updateEnvValue('RD_REFRESH_TOKEN', newRefreshToken);

    console.log('✅ Token atualizado com sucesso!');
    console.log(`   Access Token: ${newAccessToken.substring(0, 20)}...`);
    console.log(`   Refresh Token: ${newRefreshToken.substring(0, 20)}...`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
  } catch (error) {
    console.error('❌ Erro ao fazer refresh do token:', error);
    process.exit(1);
  }
}

// Executa o refresh token
refreshToken()
  .then(() => {
    console.log('✨ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
