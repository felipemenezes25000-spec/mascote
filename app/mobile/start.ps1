$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  ============================" -ForegroundColor Cyan
Write-Host "  MASCOTE - app local" -ForegroundColor Cyan
Write-Host "  ============================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path $PSScriptRoot

if (-not (Test-Path 'node_modules')) {
    Write-Host "Instalando dependencias (primeira vez)..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Falha no npm install." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Abrindo Expo no navegador..." -ForegroundColor Green
Write-Host "Se nao abrir, va manualmente em: http://localhost:8081" -ForegroundColor Green
Write-Host ""

npx expo start --web
