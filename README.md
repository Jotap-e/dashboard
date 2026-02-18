# AdvHub Dashboard

Projeto Dashboard do AdvHub AI com arquitetura separada entre frontend (Next.js) e backend (NestJS).

## 📁 Estrutura do Projeto

```
Dashboard/
├── front/          # Frontend Next.js
│   ├── app/        # App Router do Next.js
│   ├── components/ # Componentes React
│   └── ...
├── back/           # Backend NestJS
│   ├── src/        # Código fonte
│   └── ...
└── README.md       # Este arquivo
```

## 🚀 Como Começar

### Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn

### Instalação

1. **Instalar dependências do frontend:**
```bash
cd front
npm install
```

2. **Instalar dependências do backend:**
```bash
cd back
npm install
```

### Desenvolvimento

#### Opção 1: Rodar separadamente

**Terminal 1 - Frontend:**
```bash
cd front
npm run dev
```
Frontend estará disponível em: http://localhost:3000

**Terminal 2 - Backend:**
```bash
cd back
npm run start:dev
```
Backend estará disponível em: http://localhost:3001/api

#### Opção 2: Usar scripts do package.json raiz

```bash
# Instalar dependências de ambos
npm run install:all

# Rodar ambos em desenvolvimento
npm run dev

# Build de ambos
npm run build
```

## 📝 Scripts Disponíveis

### Frontend (`front/`)
- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run start` - Inicia servidor de produção
- `npm run lint` - Executa linter

### Backend (`back/`)
- `npm run start:dev` - Inicia servidor de desenvolvimento com hot-reload
- `npm run build` - Compila TypeScript
- `npm run start:prod` - Inicia servidor de produção
- `npm run lint` - Executa linter
- `npm run test` - Executa testes unitários
- `npm run test:e2e` - Executa testes end-to-end

## 🔧 Configuração

### Frontend
- Porta padrão: `3000`
- Configurado para fazer proxy de `/api/*` para `http://localhost:3001/api/*`

### Backend
- Porta padrão: `3001`
- Prefixo global: `/api`
- CORS habilitado para `http://localhost:3000`

## 📦 Tecnologias

### Frontend
- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **App Router** - Roteamento do Next.js

### Backend
- **NestJS** - Framework Node.js
- **TypeScript** - Tipagem estática
- **Express** - Servidor HTTP

## 🏗️ Próximos Passos

1. Configurar banco de dados
2. Implementar autenticação
3. Criar módulos específicos no backend
4. Desenvolver componentes no frontend
5. Configurar variáveis de ambiente

## 📄 Licença

Este projeto é privado e confidencial.
