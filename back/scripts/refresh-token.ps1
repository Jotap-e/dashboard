# Script PowerShell para fazer refresh do token RD Station
# Este script faz uma requisição HTTP para o endpoint do backend

$backendUrl = "http://localhost:3001/api/rd-token/refresh"

Write-Host "🔄 Iniciando refresh do token RD Station via endpoint do backend..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $backendUrl -Method POST -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Refresh token executado com sucesso!" -ForegroundColor Green
        Write-Host $response.Content
    } else {
        Write-Host "❌ Erro: Status code $($response.StatusCode)" -ForegroundColor Red
        Write-Host $response.Content
    }
} catch {
    Write-Host "❌ Erro ao executar refresh token:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta do servidor: $responseBody" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "💡 Certifique-se de que o backend está rodando na porta 3001" -ForegroundColor Yellow
    Write-Host "   Execute: cd back && npm run start:dev" -ForegroundColor Yellow
}
