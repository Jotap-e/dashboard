# Deploy no Vercel

## Configuração

Este projeto está configurado para deploy no Vercel como serverless function.

## Arquivos de Configuração

- `vercel.json` - Configuração do Vercel
- `api/index.ts` - Handler serverless para o Vercel
- `.vercelignore` - Arquivos ignorados no deploy

## Variáveis de Ambiente Necessárias

Configure as seguintes variáveis de ambiente no Vercel:

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

### Frontend URL (opcional)
- `FRONTEND_URL` - URL do frontend para CORS

## Build

```bash
pnpm run build
```

## Deploy

1. Instale a CLI do Vercel: `npm i -g vercel`
2. Execute: `vercel` na pasta `back/`
3. Siga as instruções para configurar o projeto

## Notas Importantes

- WebSocket pode não funcionar completamente no ambiente serverless do Vercel
- O arquivo `.env` não é enviado para o Vercel (use variáveis de ambiente no dashboard)
- O build gera os arquivos em `dist/`
