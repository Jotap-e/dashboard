// Script de teste para verificar a rota de deals
const https = require('https');
const http = require('http');

console.log('🧪 Testando rota de deals do RD Station...\n');

// Teste 1: Rota sem filtro de owner
console.log('📋 Teste 1: Buscar todos os deals (sem owner_id)');
testRoute('http://127.0.0.1:3001/api/deals?page=1&size=5')
  .then(() => {
    console.log('\n✅ Teste 1 concluído\n');
    
    // Teste 2: Rota com filtro de owner
    console.log('👤 Teste 2: Buscar deals de um vendedor específico');
    return testRoute('http://127.0.0.1:3001/api/deals?owner_id=6936c37038809600166ca22a&page=1&size=5');
  })
  .then(() => {
    console.log('\n✅ Teste 2 concluído\n');
    console.log('🎉 Todos os testes concluídos!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro nos testes:', error.message);
    process.exit(1);
  });

function testRoute(url) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔗 URL: ${url}`);
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      console.log(`📡 Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`📋 Headers:`, res.headers);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('✅ Resposta JSON recebida:');
          console.log(`   - Total de deals: ${json.data?.length || 0}`);
          console.log(`   - Tem links: ${!!json.links}`);
          console.log(`   - Tem erros: ${!!json.errors}`);
          
          if (json.errors) {
            console.log(`   ⚠️ Erros:`, json.errors);
          }
          
          if (json.data && json.data.length > 0) {
            console.log(`   📊 Primeiro deal:`, {
              id: json.data[0].id,
              name: json.data[0].name,
              status: json.data[0].status,
              total_price: json.data[0].total_price,
            });
          }
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`Status ${res.statusCode}: ${JSON.stringify(json)}`));
          }
        } catch (error) {
          console.error('❌ Erro ao parsear JSON:', error.message);
          console.error('📄 Resposta recebida:', data.substring(0, 500));
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro na requisição:', error.message);
      reject(error);
    });

    req.end();
  });
}
