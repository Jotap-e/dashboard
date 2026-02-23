# 🚀 Deploy do Frontend no Vercel

## Configuração

Este projeto está configurado para deploy no Vercel, uma plataforma otimizada para aplicações Next.js.

## Arquivos de Configuração

- `vercel.json` - Configuração do Vercel (opcional, Vercel detecta Next.js automaticamente)
- `.env.example` - Exemplo de variáveis de ambiente

## Variáveis de Ambiente Necessárias

Configure as seguintes variáveis de ambiente no Vercel (Settings → Environment Variables):

### Backend URL (Obrigatório)
- `NEXT_PUBLIC_BACKEND_URL` - URL do backend em produção (ex: `https://seu-backend.onrender.com`)
  - **IMPORTANTE:** Não inclua `/api` no final, apenas a URL base
  - Esta variável é usada para:
    - Conexões WebSocket (`wss://seu-backend.onrender.com/deals`)
    - Chamadas de API através das rotas Next.js em `app/api/`

### Opcional (para compatibilidade)
- `NEXT_PUBLIC_API_URL` - URL completa da API (ex: `https://seu-backend.onrender.com/api`)
  - Mantido para compatibilidade, mas `NEXT_PUBLIC_BACKEND_URL` é preferido

## Deploy no Vercel

### Método 1: Via Dashboard do Vercel (Recomendado)

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New..."** → **"Project"**
3. Conecte seu repositório GitHub/GitLab
4. **Configurações do Projeto:**
   - **Framework Preset:** Next.js (detectado automaticamente)
   - **Root Directory:** `front` ⚠️ **IMPORTANTE:** Configure como `front` para fazer deploy apenas do frontend
   - **Build Command:** `npm run build` (ou deixe em branco para usar o padrão)
   - **Output Directory:** `.next` (ou deixe em branco para usar o padrão)
   - **Install Command:** `npm install` (ou deixe em branco para usar o padrão)
5. Configure as variáveis de ambiente em **"Environment Variables"**:
   - `NEXT_PUBLIC_BACKEND_URL` = `https://seu-backend.onrender.com` (URL do seu backend no Render)
6. Clique em **"Deploy"**
7. O deploy será iniciado automaticamente

### Método 2: Via CLI do Vercel

1. Instale a CLI: `npm i -g vercel`
2. Navegue para o diretório `front/`: `cd front`
3. Execute: `vercel`
4. Siga as instruções:
   - Link to existing project? **N** (primeira vez)
   - Project name: `advhub-dashboard-frontend` (ou o nome que preferir)
   - Directory: `./` (ou deixe em branco)
   - Override settings? **N**
5. Configure as variáveis de ambiente:
   ```bash
   vercel env add NEXT_PUBLIC_BACKEND_URL
   # Digite a URL do backend quando solicitado
   ```
6. Faça o deploy: `vercel --prod`

## Build e Deploy

O Vercel executará automaticamente:
- `npm install` para instalar dependências
- `npm run build` para compilar o Next.js (executa `next build`)
- Deploy automático após build bem-sucedido

## Verificando o Deploy

Após o deploy, o Vercel fornecerá uma URL pública. Você pode verificar:

- **Frontend:** `https://seu-projeto.vercel.app`
- **WebSocket:** Conectará automaticamente ao backend configurado em `NEXT_PUBLIC_BACKEND_URL`

## Configuração do Backend

Certifique-se de que o backend está configurado para aceitar requisições do frontend:

1. No backend (Render), configure a variável de ambiente:
   - `FRONTEND_URL` = `https://seu-projeto.vercel.app`
   - Isso habilita CORS para o frontend

2. O backend deve estar rodando e acessível publicamente

## Notas Importantes

- ✅ Vercel é otimizado para Next.js e oferece deploy automático
- ✅ Variáveis de ambiente com prefixo `NEXT_PUBLIC_` são expostas ao cliente
- ✅ O arquivo `.env` local não é usado no Vercel (configure as variáveis no dashboard)
- ⚠️ **Root Directory deve ser configurado como `front`** para evitar tentativas de build do backend
- ⚠️ Certifique-se de que `NEXT_PUBLIC_BACKEND_URL` aponta para o backend em produção
- ⚠️ Use `https://` (não `http://`) para URLs de produção
- ⚠️ Para WebSocket, o Vercel converte automaticamente `http://` para `ws://` e `https://` para `wss://`

## Troubleshooting

### Erro: "Cannot connect to backend" ou WebSocket não conecta
**Causa:** `NEXT_PUBLIC_BACKEND_URL` não está configurado ou está incorreto

**Solução:**
1. Vá em **Settings** → **Environment Variables** no Vercel
2. Configure `NEXT_PUBLIC_BACKEND_URL` com a URL completa do backend (ex: `https://seu-backend.onrender.com`)
3. Faça um novo deploy

### Erro: CORS no backend
**Causa:** Backend não está configurado para aceitar requisições do frontend

**Solução:**
1. No backend (Render), configure `FRONTEND_URL` = `https://seu-projeto.vercel.app`
2. Reinicie o backend

### Build falha
- Verifique se todas as dependências estão no `package.json`
- Confirme que o script `build` está configurado corretamente
- Verifique os logs completos no dashboard do Vercel

### Variáveis de ambiente não funcionam
- Certifique-se de que as variáveis começam com `NEXT_PUBLIC_` para serem expostas ao cliente
- Faça um novo deploy após adicionar/modificar variáveis de ambiente
- Variáveis são injetadas no build, então mudanças requerem novo build

## Estrutura de URLs

### Desenvolvimento Local
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3002`
- WebSocket: `ws://localhost:3002/deals`

### Produção
- Frontend: `https://seu-projeto.vercel.app`
- Backend: `https://seu-backend.onrender.com`
- WebSocket: `wss://seu-backend.onrender.com/deals`

## Próximos Passos

1. Configure o backend no Render com `FRONTEND_URL` apontando para o Vercel
2. Configure `NEXT_PUBLIC_BACKEND_URL` no Vercel apontando para o Render
3. Faça o deploy de ambos
4. Teste a conexão WebSocket e as chamadas de API
