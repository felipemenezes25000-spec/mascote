# Roda Maestro critical flows no emulador (Windows).
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$Maestro = Join-Path $env:USERPROFILE '.maestro\bin\maestro.bat'
if (-not (Test-Path $Maestro)) { $Maestro = 'maestro' }

# Metro precisa estar rodando: `npx expo start --clear` (Node 18–20 recomendado).
$metro = try { (Invoke-WebRequest -Uri 'http://localhost:8081/status' -UseBasicParsing -TimeoutSec 2).StatusCode } catch { 0 }
if ($metro -ne 200) {
  Write-Host 'Iniciando Metro em background (porta 8081)...'
  Start-Process powershell -ArgumentList @(
    '-NoProfile', '-Command',
    "Set-Location '$Root'; npx expo start --clear --port 8081"
  ) -WindowStyle Minimized
  for ($i = 0; $i -lt 90; $i++) {
    $ok = try { (Invoke-WebRequest -Uri 'http://localhost:8081/status' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { $false }
    if ($ok) { break }
    Start-Sleep -Seconds 2
  }
}

& "$PSScriptRoot\start-emulator.ps1"

$adb = Join-Path ($env:ANDROID_HOME ?? (Join-Path $env:LOCALAPPDATA 'Android\Sdk')) 'platform-tools\adb.exe'
$devices = & $adb devices | Select-String 'device$'
if (-not $devices) {
  Write-Error 'Nenhum dispositivo Android conectado. Abra o emulador ou conecte um celular.'
}

Write-Host 'Rodando Maestro (critical)...'
& $Maestro test --include-tags=critical .maestro/
