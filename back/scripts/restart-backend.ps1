# Script para verificar porta 3001, matar processos e reiniciar o backend

Write-Host "🔍 Verificando processos na porta 3001..." -ForegroundColor Yellow

# Verificar processos na porta 3001
$connections = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

if ($connections) {
    Write-Host "⚠️ Encontrados processos usando a porta 3001:" -ForegroundColor Yellow
    
    foreach ($conn in $connections) {
        $processId = $conn.OwningProcess
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        
        if ($process) {
            Write-Host "  - PID: $processId | Nome: $($process.ProcessName) | Estado: $($conn.State)" -ForegroundColor Cyan
            
            # Matar o processo
            Write-Host "  🛑 Encerrando processo $processId..." -ForegroundColor Yellow
            try {
                Stop-Process -Id $processId -Force -ErrorAction Stop
                Write-Host "  ✅ Processo $processId encerrado com sucesso" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Erro ao encerrar processo $processId : $_" -ForegroundColor Red
            }
        }
    }
    
    # Aguardar um pouco para garantir que a porta foi liberada
    Write-Host "⏳ Aguardando 2 segundos para liberar a porta..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
} else {
    Write-Host "✅ Nenhum processo encontrado na porta 3001" -ForegroundColor Green
}

# Verificar novamente se a porta está livre
$connectionsAfter = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($connectionsAfter) {
    Write-Host "⚠️ Ainda há processos na porta 3001. Tente encerrar manualmente." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Iniciando backend..." -ForegroundColor Green
Write-Host ""

# Navegar para o diretório do backend
Set-Location $PSScriptRoot\..

# Iniciar o backend em modo desenvolvimento
npm run start:dev
