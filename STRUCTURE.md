# 📁 Estrutura do Projeto

```
Dashboard/
│
├── front/                          # Frontend Next.js
│   ├── app/                        # App Router (Next.js 14)
│   │   ├── api/                    # API Routes do Next.js
│   │   │   └── test/
│   │   │       └── route.ts        # Exemplo de API route
│   │   ├── globals.css             # Estilos globais
│   │   ├── layout.tsx              # Layout raiz
│   │   └── page.tsx                # Página inicial
│   ├── components/                 # Componentes React (criar conforme necessário)
│   ├── public/                     # Arquivos estáticos
│   ├── .env.example                # Exemplo de variáveis de ambiente
│   ├── .eslintrc.json              # Configuração ESLint
│   ├── .gitignore                  # Git ignore
│   ├── next.config.js              # Configuração Next.js
│   ├── package.json                # Dependências frontend
│   ├── postcss.config.js           # Configuração PostCSS
│   ├── tailwind.config.ts          # Configuração Tailwind CSS
│   └── tsconfig.json               # Configuração TypeScript
│
├── back/                           # Backend NestJS
│   ├── src/
│   │   ├── app.controller.ts       # Controller principal
│   │   ├── app.module.ts           # Módulo principal
│   │   ├── app.service.ts          # Service principal
│   │   └── main.ts                 # Arquivo de entrada
│   ├── test/                       # Testes (criar conforme necessário)
│   ├── .env.example                # Exemplo de variáveis de ambiente
│   ├── .eslintrc.js                # Configuração ESLint
│   ├── .gitignore                  # Git ignore
│   ├── .prettierrc                 # Configuração Prettier
│   ├── nest-cli.json               # Configuração NestJS CLI
│   ├── package.json                # Dependências backend
│   └── tsconfig.json               # Configuração TypeScript
│
├── .gitignore                      # Git ignore raiz
├── package.json                    # Scripts compartilhados
└── README.md                       # Documentação principal
```

## 🔄 Fluxo de Comunicação

```
Frontend (Next.js)          Backend (NestJS)
     :3000                       :3001
       │                            │
       │  GET /api/test             │
       ├───────────────────────────>│
       │                            │
       │  GET /api/health           │
       ├───────────────────────────>│
       │                            │
       │  Response JSON             │
       │<───────────────────────────┤
       │                            │
```

## 📝 Próximas Estruturas Recomendadas

### Frontend (`front/`)
```
front/
├── app/
│   ├── (auth)/                    # Grupo de rotas de autenticação
│   ├── dashboard/                 # Páginas do dashboard
│   └── api/                       # API Routes
├── components/
│   ├── ui/                        # Componentes UI reutilizáveis
│   ├── layout/                    # Componentes de layout
│   └── features/                  # Componentes específicos de features
├── lib/                           # Utilitários e helpers
├── hooks/                         # Custom hooks React
└── types/                         # Tipos TypeScript
```

### Backend (`back/`)
```
back/
├── src/
│   ├── modules/                   # Módulos NestJS
│   │   ├── auth/                  # Módulo de autenticação
│   │   ├── users/                 # Módulo de usuários
│   │   └── ...
│   ├── common/                    # Código compartilhado
│   │   ├── decorators/            # Decorators customizados
│   │   ├── filters/               # Exception filters
│   │   ├── guards/                # Guards
│   │   ├── interceptors/          # Interceptors
│   │   └── pipes/                 # Pipes
│   ├── config/                    # Configurações
│   └── database/                  # Configuração de banco de dados
└── test/                          # Testes
```
