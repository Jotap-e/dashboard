# Script simples para reiniciar o backend

Write-Host "🛑 Parando processos Node.js na porta 3002..." -ForegroundColor Yellow

# Matar processos Node.js que possam estar usando a porta 3002
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $connections = Get-NetTCPConnection -OwningProcess $_.Id -LocalPort 3002 -ErrorAction SilentlyContinue
    $connections -ne $null
}

if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        Write-Host "  Matando processo Node.js PID: $($proc.Id)" -ForegroundColor Cyan
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "  Nenhum processo Node.js encontrado na porta 3002" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Iniciando backend..." -ForegroundColor Green
Write-Host ""

# Navegar para o diretório do backend
Set-Location $PSScriptRoot\..

# Iniciar o backend
npm run start:dev
