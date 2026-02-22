# WebSocket Setup

## Dependências Necessárias

Para usar WebSocket no backend, você precisa instalar as seguintes dependências:

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io
```

O `socket.io` já está instalado no projeto.

## Estrutura

- `src/websocket/deals.gateway.ts` - Gateway WebSocket que gerencia conexões e mensagens
- `src/websocket/websocket.module.ts` - Módulo WebSocket
- `src/app.module.ts` - Módulo principal (já integrado)

## Como Funciona

1. **Backend**: O gateway WebSocket escuta na rota `/deals` e gerencia duas salas:
   - `painel`: Clientes que recebem atualizações
   - `controle`: Clientes que enviam atualizações

2. **Frontend - Página de Controle**:
   - Conecta-se à sala `controle`
   - Quando o botão "Definir como Agora" é clicado:
     - Atualiza o deal no backend/RD Station via API REST
     - Envia atualização via WebSocket para a sala `painel`

3. **Frontend - Página de Painel**:
   - Conecta-se à sala `painel`
   - Recebe atualizações em tempo real quando um deal é marcado como "now"
   - Recarrega automaticamente os deals quando recebe uma atualização

## Eventos WebSocket

### Cliente → Servidor

- `join-painel`: Cliente entra na sala de painel
- `join-controle`: Cliente entra na sala de controle
- `update-deal-now`: Envia atualização de flag "now" (apenas controle)

### Servidor → Cliente

- `joined`: Confirmação de entrada na sala
- `deal-now-updated`: Atualização recebida (apenas painel)
- `deal-now-update-sent`: Confirmação de envio (apenas controle)
- `error`: Erro na operação

## Formato de Dados

```typescript
interface DealNowUpdate {
  deal_id: string;
  is_now: boolean;
  updated_at: string; // ISO 8601
  owner_id?: string;
}
```
