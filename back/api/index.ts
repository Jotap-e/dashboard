import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

let cachedApp: express.Express;

async function bootstrap() {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  
  const app = await NestFactory.create(AppModule, adapter);
  
  // Configurar WebSocket adapter (pode não funcionar no Vercel serverless)
  try {
    app.useWebSocketAdapter(new IoAdapter(app));
  } catch (error) {
    console.warn('⚠️ WebSocket não disponível no ambiente serverless');
  }
  
  // Habilitar CORS para comunicação com o frontend
  const frontendUrl = process.env.FRONTEND_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000';
  
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Registrar filtro global de exceções para garantir respostas JSON
  app.useGlobalFilters(new AllExceptionsFilter());

  // Prefixo global para todas as rotas
  app.setGlobalPrefix('api');

  await app.init();
  cachedApp = expressApp;
  
  return expressApp;
}

export default async function handler(req: express.Request, res: express.Response) {
  const app = await bootstrap();
  return app(req, res);
}
