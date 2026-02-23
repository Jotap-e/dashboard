# Guia para Reiniciar o Backend

## Passo 1: Matar processos na porta 3002

Execute no PowerShell:

```powershell
# Ver processos na porta 3002
Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, State, OwningProcess

# Matar todos os processos Node.js (cuidado: isso mata TODOS os processos Node.js)
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
```

Ou use o script criado:

```powershell
cd back
.\scripts\kill-port-3001.ps1
```

## Passo 2: Verificar se a porta está livre

```powershell
Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
```

Se não retornar nada, a porta está livre.

## Passo 3: Iniciar o backend

```powershell
cd back
npm run start:dev
```

Você deve ver:
```
🚀 Backend rodando em http://localhost:3001/api
🔌 WebSocket disponível em ws://localhost:3001/deals
```

## Passo 4: Testar se está funcionando

Abra outro terminal e teste:

```powershell
# Teste de health check
curl http://localhost:3002/api/health

# Ou no navegador:
# http://localhost:3002/api/health
```

Deve retornar:
```json
{
  "status": "ok",
  "message": "Backend está funcionando corretamente",
  "timestamp": "..."
}
```

## Passo 5: Testar rota de deals

```powershell
curl "http://localhost:3002/api/deals?owner_id=6936c37038809600166ca22a&page=1&size=25"
```

Ou no navegador:
```
http://localhost:3002/api/deals?owner_id=6936c37038809600166ca22a&page=1&size=25
```

## Problemas comuns

1. **Porta já em uso**: Use o Passo 1 para matar processos
2. **Dependências não instaladas**: Execute `npm install` na pasta `back`
3. **Erro de compilação**: Verifique os logs do terminal para erros específicos
4. **Token expirado**: Execute `npm run refresh-token` na pasta `back`
