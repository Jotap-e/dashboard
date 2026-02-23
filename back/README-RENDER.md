# 🚀 Deploy no Render

## Configuração

Este projeto está configurado para deploy no Render, uma plataforma que suporta aplicações Node.js tradicionais com WebSocket.

## Arquivos de Configuração

- `render.yaml` - Configuração do Render (opcional, pode ser configurado via dashboard)
- `package.json` - Contém os scripts `build` e `start:prod` usados pelo Render

## Variáveis de Ambiente Necessárias

Configure as seguintes variáveis de ambiente no Render (Settings → Environment):

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
- `PORT` - Render define automaticamente, não precisa configurar manualmente

## Deploy no Render

### Método 1: Via Dashboard do Render (Recomendado)

1. Acesse [render.com](https://render.com) e faça login
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório GitHub/GitLab
4. **Configurações do Serviço:**
   - **Name:** `advhub-dashboard-backend` (ou o nome que preferir)
   - **Region:** Escolha a região mais próxima (ex: Oregon)
   - **Branch:** `main` (ou sua branch principal)
   - **Root Directory:** `back` ⚠️ **IMPORTANTE:** Configure como `back` para fazer deploy apenas do backend
   - **Runtime:** `Node`
   - **Build Command:** `pnpm install --prod=false && pnpm run build`
   - **Start Command:** `pnpm run start:prod`
   - **Plan:** Escolha o plano (Starter, Standard, etc.)
5. Configure as variáveis de ambiente em **"Environment"**
6. Clique em **"Create Web Service"**
7. O deploy será iniciado automaticamente

### Método 2: Via render.yaml

1. O arquivo `render.yaml` já está configurado
2. No Render, ao criar um novo serviço, selecione **"Apply Render.yaml"**
3. O Render lerá o arquivo `render.yaml` e configurará automaticamente
4. Configure as variáveis de ambiente manualmente no dashboard

### Método 3: Via CLI do Render

1. Instale a CLI: `npm i -g render-cli`
2. Faça login: `render login`
3. Navegue para o diretório `back/`: `cd back`
4. Execute: `render deploy`
5. Configure as variáveis de ambiente no dashboard

## Build e Start

O Render executará automaticamente:
- `pnpm install --prod=false` para instalar todas as dependências (incluindo devDependencies necessárias para o build)
- `pnpm run build` para compilar o TypeScript (executa `nest build`)
- `pnpm run start:prod` para iniciar a aplicação (executa `node dist/main`)

**Nota:** O flag `--prod=false` garante que as devDependencies (como `@nestjs/cli` e `typescript`) sejam instaladas, pois são necessárias para compilar o projeto.

## Verificando o Deploy

Após o deploy, o Render fornecerá uma URL pública. Você pode verificar:

- **API:** `https://seu-servico.onrender.com/api`
- **WebSocket:** `wss://seu-servico.onrender.com/deals`
- **Health Check:** `https://seu-servico.onrender.com/api` (configurado no `render.yaml`)

## Notas Importantes

- ✅ WebSocket funciona normalmente no Render
- ✅ Render suporta aplicações Node.js tradicionais (não serverless)
- ✅ A porta é definida automaticamente pela variável `PORT` do Render
- ✅ Certifique-se de configurar `FRONTEND_URL` com a URL do seu frontend em produção
- ⚠️ O arquivo `.env` local não é usado no Render (configure as variáveis no dashboard)
- ⚠️ **Root Directory deve ser configurado como `back`** para evitar tentativas de build do frontend
- ⚠️ Render pode colocar serviços inativos em "sleep" no plano gratuito após 15 minutos de inatividade

## Troubleshooting

### Erro: "next: not found" ou build falha tentando compilar frontend
**Causa:** O Root Directory não está configurado como `back`

**Solução:**
1. Vá em **Settings** → **Build & Deploy** no dashboard do Render
2. Configure o **Root Directory** como `back` (sem barra final)
3. Salve e faça um novo deploy

### Build falha
- Verifique se todas as dependências estão no `package.json`
- Confirme que o script `build` está configurado corretamente
- Verifique os logs completos no dashboard do Render

### Aplicação não inicia
- Verifique os logs no dashboard do Render
- Confirme que todas as variáveis de ambiente estão configuradas
- Verifique se o MongoDB está acessível do Render
- Confirme que o script `start:prod` está funcionando localmente

### CORS errors
- Configure `FRONTEND_URL` com a URL exata do seu frontend (incluindo `https://`)
- Verifique se o frontend está fazendo requisições para a URL correta do Render
- Confirme que o CORS está habilitado no `main.ts` do backend

### Serviço em "sleep"
- No plano gratuito, serviços ficam inativos após 15 minutos sem requisições
- A primeira requisição após o sleep pode demorar alguns segundos para "acordar" o serviço
- Considere usar um serviço de "ping" periódico ou upgrade para um plano pago

### WebSocket não conecta
- Verifique se o WebSocket está configurado corretamente no `main.ts`
- Confirme que o frontend está usando `wss://` (WebSocket seguro) em produção
- Verifique os logs do Render para erros de conexão WebSocket
