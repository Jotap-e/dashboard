# 🚀 Guia Rápido de Início

## Instalação Rápida

### 1. Instalar dependências

```bash
# Na raiz do projeto Dashboard
npm run install:all
```

Ou manualmente:

```bash
cd front && npm install && cd ..
cd back && npm install && cd ..
```

### 2. Rodar em desenvolvimento

**Opção A: Rodar ambos simultaneamente (recomendado)**
```bash
# Na raiz do projeto
npm run dev
```

**Opção B: Rodar separadamente**

Terminal 1 (Frontend):
```bash
cd front
npm run dev
```

Terminal 2 (Backend):
```bash
cd back
npm run start:dev
```

### 3. Acessar a aplicação

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

## ✅ Verificação

1. Abra http://localhost:3000 no navegador
2. Você deve ver a página inicial com status do sistema
3. Se o backend estiver rodando, verá "✅ Conectado"

## 🔧 Comandos Úteis

### Frontend
```bash
cd front
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run start    # Servidor de produção
npm run lint     # Verificar código
```

### Backend
```bash
cd back
npm run start:dev    # Desenvolvimento com hot-reload
npm run build        # Compilar TypeScript
npm run start:prod   # Produção
npm run lint         # Verificar código
npm run test         # Rodar testes
```

## 📝 Próximos Passos

1. ✅ Estrutura criada
2. ⏭️ Configurar banco de dados
3. ⏭️ Implementar autenticação
4. ⏭️ Criar módulos específicos
5. ⏭️ Desenvolver componentes

## 🐛 Troubleshooting

### Porta já em uso
- Frontend: Altere a porta no `package.json` do frontend: `"dev": "next dev -p 3001"`
- Backend: Altere a variável `PORT` no `.env` do backend

### Erro de CORS
- Verifique se o backend está configurado para aceitar requisições do frontend
- Confira o arquivo `back/src/main.ts` - CORS está configurado para `http://localhost:3000`

### Dependências não instaladas
```bash
# Limpar e reinstalar
rm -rf front/node_modules back/node_modules
npm run install:all
```
