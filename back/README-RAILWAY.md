# 🚂 Deploy no Railway

## Configuração

Este projeto está configurado para deploy no Railway, uma plataforma que suporta aplicações Node.js tradicionais com WebSocket.

## Arquivos de Configuração

- `railway.json` - Configuração do Railway
- `package.json` - Contém os scripts `build` e `start:prod` usados pelo Railway

## Variáveis de Ambiente Necessárias

Configure as seguintes variáveis de ambiente no Railway (Settings → Variables):

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

### Porta (automático)
- `PORT` - Railway define automaticamente, não precisa configurar manualmente

## Deploy no Railway

### Método 1: Via Dashboard do Railway (Recomendado)

1. Acesse [railway.app](https://railway.app) e faça login
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Conecte seu repositório
5. **CRÍTICO:** Configure o **Root Directory** como `back` nas configurações do serviço:
   - Vá em **Settings** → **Source**
   - Configure **Root Directory** como `back` (sem barra final)
   - Salve as configurações
6. Configure as variáveis de ambiente em **Settings** → **Variables**
7. O deploy será iniciado automaticamente

### Método 2: Via CLI do Railway

1. Instale a CLI: `npm i -g @railway/cli`
2. Faça login: `railway login`
3. Navegue para o diretório `back/`: `cd back`
4. Execute: `railway init`
5. Configure as variáveis de ambiente: `railway variables set NOME_VARIAVEL=valor`
6. Faça o deploy: `railway up`

## Build e Start

O Railway executará automaticamente (quando configurado com `back/` como root directory):
- `npm install` para instalar dependências
- `npm run build` para compilar o TypeScript (executa `nest build`)
- `npm run start:prod` para iniciar a aplicação (executa `node dist/main`)

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
- ⚠️ **Root Directory deve ser configurado como `back`** para evitar tentativas de build do frontend

## Troubleshooting

### Erro: "Cannot find module '/app/back/dist/main'" ou "MODULE_NOT_FOUND"
**Causa:** O Root Directory não está configurado como `back` ou o build não foi executado

**Solução:**
1. Vá em **Settings** → **Source** no dashboard do Railway
2. Configure o **Root Directory** como `back` (sem barra final)
3. Salve e faça um novo deploy
4. Verifique os logs do build para confirmar que `npm run build` foi executado
5. O Railway deve executar `npm run start:prod` (não `npm run start`)

### Erro: "next: not found" ou build falha tentando compilar frontend
**Causa:** O Root Directory não está configurado como `back`

**Solução:**
1. Vá em **Settings** → **Source** no dashboard do Railway
2. Configure o **Root Directory** como `back` (sem barra final)
3. Salve e faça um novo deploy

### Build falha
- Verifique se todas as dependências estão no `package.json`
- Confirme que o script `build` está configurado corretamente
- Verifique os logs completos no dashboard do Railway

### Aplicação não inicia
- Verifique os logs no dashboard do Railway
- Confirme que todas as variáveis de ambiente estão configuradas
- Verifique se o MongoDB está acessível do Railway
- Confirme que o script `start:prod` está funcionando localmente

### CORS errors
- Configure `FRONTEND_URL` com a URL exata do seu frontend (incluindo `https://`)
- Verifique se o frontend está fazendo requisições para a URL correta do Railway
- Confirme que o CORS está habilitado no `main.ts` do backend

### WebSocket não conecta
- Verifique se o WebSocket está configurado corretamente no `main.ts`
- Confirme que o frontend está usando `wss://` (WebSocket seguro) em produção
- Verifique os logs do Railway para erros de conexão WebSocket
