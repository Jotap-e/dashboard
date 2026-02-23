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
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('#') || !trimmedLine.includes('=')) {
        continue;
      }
      const [envKey, ...valueParts] = trimmedLine.split('=');
      if (envKey.trim() === key) {
        const value = valueParts.join('=').trim();
        return value.replace(/^["']|["']$/g, '');
      }
    }
    return null;
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
    
    // Buscar linha que contém a chave
    const lines = envContent.split('\n');
    let found = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith(`${key}=`)) {
        lines[i] = `${key}=${value}`;
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Adicionar no final se não encontrou
      lines.push(`${key}=${value}`);
    }
    
    envContent = lines.join('\n');
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
 * Obtém novos tokens usando código de autorização
 */
async function getNewTokens() {
  console.log('🔄 Obtendo novos tokens RD Station usando código de autorização...\n');

  const clientId = getEnvValue('RD_CLIENT_ID');
  const clientSecret = getEnvValue('RD_CLIENT_SECRET');
  const code = getEnvValue('RD_CODE');
  const redirectUri = getEnvValue('RD_REDIRECT_URI');

  console.log('📋 Valores do .env:');
  console.log(`   Client ID: ${clientId}`);
  console.log(`   Client Secret: ${clientSecret ? '***' + clientSecret.slice(-4) : 'NÃO ENCONTRADO'}`);
  console.log(`   Code: ${code}`);
  console.log(`   Redirect URI: ${redirectUri}\n`);

  if (!clientId || !clientSecret || !code || !redirectUri) {
    console.error('❌ Valores faltando no .env:');
    if (!clientId) console.error('   - RD_CLIENT_ID');
    if (!clientSecret) console.error('   - RD_CLIENT_SECRET');
    if (!code) console.error('   - RD_CODE');
    if (!redirectUri) console.error('   - RD_REDIRECT_URI');
    process.exit(1);
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
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

  console.log('📡 Fazendo requisição para: https://api.rd.services/oauth2/token\n');

  try {
    const response = await makeHttpsRequest(options, body);

    if (response.error) {
      console.error(`❌ Erro da API: ${response.error}`);
      if (response.error_description) {
        console.error(`   Descrição: ${response.error_description}`);
      }
      process.exit(1);
    }

    const accessToken = response.access_token;
    const refreshToken = response.refresh_token;

    if (!accessToken || !refreshToken) {
      console.error('❌ Tokens não recebidos na resposta');
      console.error('Resposta completa:', JSON.stringify(response, null, 2));
      process.exit(1);
    }

    console.log('✅ Tokens obtidos com sucesso!\n');
    console.log(`   Access Token: ${accessToken.substring(0, 20)}...`);
    console.log(`   Refresh Token: ${refreshToken.substring(0, 20)}...`);
    console.log(`   Expires In: ${response.expires_in || 'N/A'} segundos`);
    console.log(`   Timestamp: ${new Date().toISOString()}\n`);

    // Atualiza os tokens no .env
    updateEnvValue('RD_ACCESS_TOKEN', accessToken);
    updateEnvValue('RD_REFRESH_TOKEN', refreshToken);

    console.log('✨ Processo concluído! Tokens atualizados no .env');
  } catch (error) {
    console.error('❌ Erro ao obter tokens:', error.message);
    if (error.message.includes('HTTP')) {
      console.error('\n💡 Dica: O código de autorização pode ter expirado.');
      console.error('   Você precisa gerar um novo código através da URL de autorização.');
    }
    process.exit(1);
  }
}

// Executa a obtenção de tokens
getNewTokens()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
