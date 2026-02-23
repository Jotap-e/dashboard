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
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
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
  console.log(`🌐 CORS configurado para: ${frontendUrl}`);
}
bootstrap();
