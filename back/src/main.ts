import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurar WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));
  
  // Habilitar CORS para comunicação com o frontend
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  // Configurar CORS para aceitar múltiplas origens
  const allowedOrigins = [
    frontendUrl,
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  
  // Adicionar domínios Vercel se FRONTEND_URL estiver definido
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('vercel.app')) {
    // Permitir todos os subdomínios do Vercel (preview deployments)
    allowedOrigins.push(/\.vercel\.app$/);
  }
  
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requisições sem origin (como Postman, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      // Verificar se a origin está na lista de permitidas
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        }
        // Se for regex, testar
        return allowed.test(origin);
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS bloqueado para origem: ${origin}`);
        console.warn(`⚠️ Origens permitidas:`, allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Registrar filtro global de exceções para garantir respostas JSON
  app.useGlobalFilters(new AllExceptionsFilter());

  // Prefixo global para todas as rotas
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3002;
  await app.listen(port);
  
  console.log(`🚀 Backend rodando na porta ${port}`);
  console.log(`📡 API disponível em http://localhost:${port}/api`);
  console.log(`🔌 WebSocket disponível em ws://localhost:${port}/deals`);
  console.log(`🌐 CORS configurado para:`, allowedOrigins);
}
bootstrap();
