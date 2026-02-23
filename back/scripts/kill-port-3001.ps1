# Script para matar todos os processos na porta 3002

Write-Host "🔍 Verificando processos na porta 3002..." -ForegroundColor Yellow

# Verificar processos na porta 3002
$connections = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue

if ($connections) {
    Write-Host "⚠️ Encontrados processos usando a porta 3002:" -ForegroundColor Yellow
    
    $pids = @()
    foreach ($conn in $connections) {
        $processId = $conn.OwningProcess
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        
        if ($process) {
            Write-Host "  - PID: $processId | Nome: $($process.ProcessName) | Estado: $($conn.State)" -ForegroundColor Cyan
            $pids += $processId
        }
    }
    
    if ($pids.Count -gt 0) {
        Write-Host ""
        Write-Host "🛑 Encerrando processos..." -ForegroundColor Yellow
        
        foreach ($pid in $pids) {
            try {
                Stop-Process -Id $pid -Force -ErrorAction Stop
                Write-Host "  ✅ Processo $pid encerrado" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Erro ao encerrar processo $pid : $_" -ForegroundColor Red
            }
        }
        
        Write-Host ""
        Write-Host "⏳ Aguardando 2 segundos..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        
        # Verificar novamente
        $connectionsAfter = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
        if ($connectionsAfter) {
            Write-Host "⚠️ Ainda há processos na porta 3002" -ForegroundColor Red
        } else {
            Write-Host "✅ Porta 3002 liberada com sucesso!" -ForegroundColor Green
        }
    }
} else {
    Write-Host "✅ Nenhum processo encontrado na porta 3002" -ForegroundColor Green
}
