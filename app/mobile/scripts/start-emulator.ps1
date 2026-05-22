# Inicia o emulador mascote_api34 em background (Windows).
$SdkRoot = $env:ANDROID_HOME
if (-not $SdkRoot) { $SdkRoot = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$Emu = Join-Path $SdkRoot 'emulator\emulator.exe'
$AvdName = 'mascote_api34'

if (-not (Test-Path $Emu)) {
  Write-Error "Emulador não encontrado. Rode scripts/setup-android-e2e-windows.ps1 primeiro."
}

$running = & (Join-Path $SdkRoot 'platform-tools\adb.exe') devices 2>$null | Select-String 'emulator-'
if ($running) {
  Write-Host 'Emulador já está rodando.'
  exit 0
}

Write-Host "Iniciando $AvdName..."
Start-Process -FilePath $Emu -ArgumentList @('-avd', $AvdName, '-no-snapshot-load') -WindowStyle Minimized

$adb = Join-Path $SdkRoot 'platform-tools\adb.exe'
Write-Host 'Aguardando boot...'
for ($i = 0; $i -lt 120; $i++) {
  $boot = & $adb shell getprop sys.boot_completed 2>$null
  if ($boot -match '1') {
    Write-Host 'Emulador pronto.'
    & $adb devices
    exit 0
  }
  Start-Sleep -Seconds 3
}
Write-Warning 'Timeout aguardando boot — o emulador pode ainda estar iniciando.'
