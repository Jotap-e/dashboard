const http = require('http');

console.log('⏳ Aguardando backend iniciar...\n');

// Aguardar 8 segundos para o backend iniciar
setTimeout(() => {
  console.log('🧪 Testando rota de deals do RD Station...\n');

  function testRoute(url, description) {
    return new Promise((resolve, reject) => {
      console.log(`\n${description}`);
      console.log(`🔗 URL: ${url}`);
      
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
        timeout: 15000,
      };

      const req = http.request(options, (res) => {
        let data = '';

        console.log(`📡 Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`📋 Content-Type: ${res.headers['content-type']}`);

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            console.log('✅ Resposta JSON recebida:');
            
            if (json.success !== undefined) {
              // Resposta do endpoint de teste
              console.log(`   ✅ Sucesso: ${json.success}`);
              console.log(`   📝 Mensagem: ${json.message}`);
              if (json.data) {
                console.log(`   📊 Total de deals: ${json.data.totalDeals}`);
                console.log(`   🔗 Tem links: ${json.data.hasLinks}`);
                if (json.data.firstDeal) {
                  console.log(`   📋 Primeiro deal:`, {
                    id: json.data.firstDeal.id,
                    name: json.data.firstDeal.name,
                    status: json.data.firstDeal.status,
                  });
                }
              }
              if (json.error) {
                console.log(`   ❌ Erro: ${json.error}`);
                if (json.stack) {
                  console.log(`   📚 Stack: ${json.stack.substring(0, 200)}...`);
                }
              }
            } else if (json.data) {
              // Resposta da rota real de deals
              console.log(`   📊 Total de deals: ${json.data.length || 0}`);
              console.log(`   🔗 Links disponíveis:`, Object.keys(json.links || {}));
              if (json.data && json.data.length > 0) {
                console.log(`   📋 Primeiro deal:`, {
                  id: json.data[0].id,
                  name: json.data[0].name,
                  status: json.data[0].status,
                  total_price: json.data[0].total_price,
                });
              }
            } else if (json.errors) {
              console.log(`   ❌ Erros encontrados:`, json.errors);
            }
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
            } else {
              reject(new Error(`Status ${res.statusCode}: ${JSON.stringify(json)}`));
            }
          } catch (error) {
            console.error('❌ Erro ao parsear JSON:', error.message);
            console.error('📄 Resposta recebida (primeiros 500 chars):', data.substring(0, 500));
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ Erro na requisição:', error.message);
        if (error.code === 'ECONNREFUSED') {
          console.error('   ⚠️ Backend não está rodando ou não está acessível em 127.0.0.1:3001');
          console.error('   💡 Verifique se o backend está rodando com: npm run start:dev');
        }
        reject(error);
      });

      req.on('timeout', () => {
        console.error('❌ Timeout na requisição (15s)');
        req.destroy();
        reject(new Error('Timeout'));
      });

      req.end();
    });
  }

  // Executar testes
  async function runTests() {
    try {
      // Teste 1: Endpoint de teste
      await testRoute('http://127.0.0.1:3001/api/test-deals', '📋 Teste 1: Endpoint de teste (/api/test-deals)');
      
      console.log('\n' + '='.repeat(60));
      
      // Teste 2: Rota real sem filtro
      await testRoute('http://127.0.0.1:3001/api/deals?page=1&size=5', '📋 Teste 2: Rota real sem filtro (/api/deals)');
      
      console.log('\n' + '='.repeat(60));
      
      // Teste 3: Rota real com filtro de owner
      await testRoute('http://127.0.0.1:3001/api/deals?owner_id=6936c37038809600166ca22a&page=1&size=5', '👤 Teste 3: Rota real com filtro de owner');
      
      console.log('\n✅ Todos os testes concluídos com sucesso!');
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Teste falhou:', error.message);
      process.exit(1);
    }
  }

  runTests();
}, 8000);
