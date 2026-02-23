/**
 * Script para gerar URL de autorização OAuth do RD Station
 * Use esta URL no navegador para obter um novo authorization code
 */

const CLIENT_ID = '74e10a6c-ed1d-4ff4-865f-288d3e394efc';
const REDIRECT_URI = 'https://www.advhub.ai/';

const authUrl = `https://api.rd.services/auth/dialog?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

console.log('🔗 URL de Autorização OAuth do RD Station:\n');
console.log(authUrl);
console.log('\n📋 Instruções:');
console.log('1. Copie a URL acima e cole no seu navegador');
console.log('2. Faça login e autorize o acesso');
console.log('3. Você será redirecionado para:', REDIRECT_URI);
console.log('4. Na URL de redirecionamento, copie o parâmetro "code"');
console.log('5. Execute: node scripts/get-new-tokens.js');
console.log('   (ou atualize o RD_CODE no arquivo .env e execute o script novamente)');
