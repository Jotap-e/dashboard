# Deploy no Railway

## Configuração

Este projeto está configurado para deploy no Railway, uma plataforma que suporta aplicações Node.js tradicionais com WebSocket.

## Arquivos de Configuração

- `railway.json` - Configuração do Railway (opcional, Railway detecta automaticamente Node.js)
- `package.json` - Contém o script `start:prod` usado pelo Railway

## Variáveis de Ambiente Necessárias

Configure as seguintes variáveis de ambiente no Railway:

### RD Station
- `RD_CLIENT_ID`
- `RD_CLIENT_SECRET`
- `RD_REFRESH_TOKEN`
- `RD_ACCESS_TOKEN`
- `RD_REDIRECT_URI`

### MongoDB
- `MONGODB_URI`
- `MONGODB_DATABASE_NAME`

### Pipeline IDs
- `SDR_PIPELINE_ID`

### IDs dos Vendedores
- `CLOSER_JOAO_VITOR_MARTINS_RIBEIRO_ID`
- `CLOSER_PEDRO_ID`
- `CLOSER_THALIA_BATISTA_ID`
- `CLOSER_VINICIUS_OLIVEIRA_ID`
- `CLOSER_YURI_RAFAEL_DOS_SANTOS_ID`
- `SDR_GABRIELO_ID`
- `SDR_RAFAEL_RATAO_ID`

### Frontend URL (obrigatório em produção)
- `FRONTEND_URL` - URL do frontend para CORS (ex: `https://seu-frontend.vercel.app`)

### Porta (opcional)
- `PORT` - Railway define automaticamente, mas você pode sobrescrever se necessário

## Deploy no Railway

### Método 1: Via Dashboard do Railway

1. Acesse [railway.app](https://railway.app) e faça login
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo" (recomendado) ou "Empty Project"
4. Se usar GitHub:
   - Conecte seu repositório
   - **IMPORTANTE:** Configure o **Root Directory** como `back/` nas configurações do serviço
   - Railway detectará automaticamente que é um projeto Node.js/NestJS
   - O Railway instalará dependências com `pnpm install` (ou `npm install`)
   - O Railway executará `pnpm run build` automaticamente
   - O Railway iniciará com `pnpm run start:prod`
5. Configure as variáveis de ambiente no dashboard do Railway
6. O deploy será iniciado automaticamente

### Método 2: Via CLI do Railway

1. Instale a CLI: `npm i -g @railway/cli`
2. Faça login: `railway login`
3. **Navegue para o diretório `back/`**: `cd back`
4. Execute: `railway init`
5. Configure as variáveis de ambiente: `railway variables set NOME_VARIAVEL=valor`
6. Faça o deploy: `railway up`

## Build e Start

O Railway executará automaticamente (quando configurado com `back/` como root directory):
- `pnpm install` (ou `npm install`) para instalar dependências
- `pnpm run build` para compilar o TypeScript (executa `nest build`)
- `pnpm run start:prod` para iniciar a aplicação (executa `node dist/main`)

**Nota:** Se você estiver fazendo deploy a partir da raiz do repositório, certifique-se de configurar o **Root Directory** como `back/` nas configurações do serviço no Railway.

## Verificando o Deploy

Após o deploy, o Railway fornecerá uma URL pública. Você pode verificar:

- **API**: `https://sua-app.railway.app/api`
- **WebSocket**: `wss://sua-app.railway.app/deals`

## Notas Importantes

- ✅ WebSocket funciona normalmente no Railway
- ✅ Railway suporta aplicações Node.js tradicionais (não serverless)
- ✅ A porta é definida automaticamente pela variável `PORT` do Railway
- ✅ Certifique-se de configurar `FRONTEND_URL` com a URL do seu frontend em produção
- ⚠️ O arquivo `.env` local não é usado no Railway (configure as variáveis no dashboard)

## Troubleshooting

### Build falha
- Verifique se todas as dependências estão no `package.json`
- Confirme que o script `build` está configurado corretamente

### Aplicação não inicia
- Verifique os logs no dashboard do Railway
- Confirme que todas as variáveis de ambiente estão configuradas
- Verifique se o MongoDB está acessível da Railway

### CORS errors
- Configure `FRONTEND_URL` com a URL exata do seu frontend (incluindo `https://`)
- Verifique se o frontend está fazendo requisições para a URL correta do Railway
