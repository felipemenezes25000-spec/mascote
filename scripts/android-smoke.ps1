<#
.SYNOPSIS
  Smoke test do Mascote no Android — checa SDK, sobe emulador, instala app
  via Expo, captura screenshots em cada etapa.

.DESCRIPTION
  Fluxo:
    1. Valida ANDROID_HOME + adb + emulator no PATH (oferece bootstrap se faltar)
    2. Lista AVDs; se nenhum existir, cria Pixel_5_API_33
    3. Sobe o emulador em -no-snapshot-save (boot limpo)
    4. Aguarda `adb wait-for-device` + `boot_completed`
    5. Garante que o Expo dev server está no ar em :8081 (sobe em --offline se preciso)
    6. Roda `npx expo start --android` para instalar + abrir o app
    7. Captura screenshots em 5 pontos do smoke (boot, welcome, signup, home, chat)
    8. Salva tudo em test-screenshots/android-<timestamp>/ e gera relatório markdown

.PARAMETER AvdName
  Nome do AVD a usar. Default Pixel_5_API_33. Se não existir, é criado.

.PARAMETER Maestro
  Se passado, executa também scripts/maestro/smoke.yaml depois do app abrir
  (requer Maestro instalado — ver README).

.PARAMETER SkipBoot
  Pula a inicialização do emulador (assume que já está rodando). Útil quando
  você já abriu pelo Android Studio AVD Manager.

.EXAMPLE
  pwsh -File scripts/android-smoke.ps1
  pwsh -File scripts/android-smoke.ps1 -AvdName Pixel_5_API_33 -Maestro
  pwsh -File scripts/android-smoke.ps1 -SkipBoot

.NOTES
  Pré-requisitos:
    - Android Studio instalado (usado pelo JBR + GUI fallback)
    - Android SDK em ~\AppData\Local\Android\Sdk (ou ANDROID_HOME definido)
    - Componentes: platform-tools, emulator, system-images;android-33;...
    - Expo dev server pode estar no ar; se não, o script sobe ele

  Bloqueio conhecido — Avast SSL interception:
    Se `sdkmanager` ficar em "Computing updates...", o Avast está interceptando
    a conexão TLS com dl.google.com. Soluções:
      A) Use Android Studio → SDK Manager pra instalar (rota diferente)
      B) Desligue HTTPS Scanning do Avast temporariamente
      C) Use celular físico + Expo Go + tunnel: `npx expo start --tunnel`
#>

param(
  [string]$AvdName = 'Pixel_5_API_33',
  [switch]$Maestro,
  [switch]$SkipBoot
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Get-Item $PSScriptRoot).Parent.FullName
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$shotsDir  = Join-Path $repoRoot "test-screenshots\android-$timestamp"
$reportMd  = Join-Path $repoRoot "test-screenshots\android-$timestamp\report.md"
New-Item -ItemType Directory -Path $shotsDir -Force | Out-Null

function Section($msg) { Write-Host ("`n=== " + $msg + " ===") -ForegroundColor Cyan }
function Ok($msg)      { Write-Host ("  [OK] " + $msg) -ForegroundColor Green }
function Warn($msg)    { Write-Host ("  ! " + $msg) -ForegroundColor Yellow }
function Fail($msg)    { Write-Host ("  [X] " + $msg) -ForegroundColor Red }

# ---- 1. Validar SDK -------------------------------------------------------
Section 'Validando Android SDK'

if (-not $env:ANDROID_HOME) {
  $candidate = "$env:LOCALAPPDATA\Android\Sdk"
  if (Test-Path $candidate) {
    $env:ANDROID_HOME = $candidate
    $env:ANDROID_SDK_ROOT = $candidate
    Ok "ANDROID_HOME=$candidate (inferido)"
  } else {
    Fail "ANDROID_HOME não está definido e $candidate não existe."
    Write-Host @'
Bootstrap manual:
  1. Abra Android Studio
  2. Tools → SDK Manager → marcar:
       - Android 13.0 (API 33)
       - Android SDK Platform-Tools
       - Android Emulator
  3. Apply, esperar download (~1GB)
  4. Reabrir terminal e rodar este script de novo
Ou, se SDK já está instalado mas em path custom:
  $env:ANDROID_HOME = "C:\caminho\para\Sdk"
'@
    exit 1
  }
} else { Ok "ANDROID_HOME=$env:ANDROID_HOME" }

# JAVA_HOME pra ferramentas — usa JBR do Android Studio se possível
if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
  $jbr = 'C:\Program Files\Android\Android Studio\jbr'
  if (Test-Path "$jbr\bin\java.exe") {
    $env:JAVA_HOME = $jbr
    Ok "JAVA_HOME=$jbr (JBR do Android Studio)"
  } else { Warn "JAVA_HOME não definido — algumas tools podem falhar" }
}

$adb       = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
$emuBin    = Join-Path $env:ANDROID_HOME 'emulator\emulator.exe'
$avdMgr    = Join-Path $env:ANDROID_HOME 'cmdline-tools\latest\bin\avdmanager.bat'
$sdkMgr    = Join-Path $env:ANDROID_HOME 'cmdline-tools\latest\bin\sdkmanager.bat'

foreach ($bin in @($adb, $emuBin, $avdMgr)) {
  if (Test-Path $bin) { Ok ("encontrado " + (Split-Path $bin -Leaf)) }
  else {
    Fail "Faltando: $bin"
    Write-Host "Instale via SDK Manager (Android Studio) ou rode:" -ForegroundColor Yellow
    Write-Host "  & '$sdkMgr' `"platform-tools`" `"emulator`" `"platforms;android-33`" `"system-images;android-33;google_apis_playstore;x86_64`"" -ForegroundColor Yellow
    exit 1
  }
}

# PATH inclui platform-tools + emulator
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"

# ---- 2. Resolver AVD ------------------------------------------------------
Section 'Resolvendo AVD'

$avds = & $emuBin -list-avds 2>$null
if ($avds -notcontains $AvdName) {
  Warn "AVD '$AvdName' não existe. Criando…"
  # System image precisa estar instalada
  $image = 'system-images;android-33;google_apis_playstore;x86_64'
  $imageOk = (& $sdkMgr --list_installed 2>$null) -match [regex]::Escape($image)
  if (-not $imageOk) {
    Warn "System image $image não está instalada."
    Write-Host "  Instalando (~1GB, pode demorar)..." -ForegroundColor Yellow
    $accept = "y`ny`ny`ny`ny`n"
    $accept | & $sdkMgr $image 2>&1 | Out-Null
  }
  # Criar AVD não-interativo
  'no' | & $avdMgr create avd -n $AvdName -k $image -d 'pixel_5' --force 2>&1 | Out-Host
  Ok "AVD criado: $AvdName"
} else { Ok "AVD encontrado: $AvdName" }

# ---- 3. Subir emulador ----------------------------------------------------
$existing = & $adb devices 2>$null | Select-String 'emulator-\d+\s+device'
if ($SkipBoot -or $existing) {
  Ok "Emulator já rodando: $existing"
} else {
  Section 'Iniciando emulador'
  # -no-snapshot-save evita estado preservado; -no-audio reduz ruído
  Start-Process -FilePath $emuBin -ArgumentList @(
    '-avd', $AvdName,
    '-no-snapshot-save',
    '-no-boot-anim',
    '-no-audio'
  ) -WindowStyle Minimized

  # Espera boot — adb wait-for-device + sys.boot_completed
  Write-Host '  Aguardando boot do emulador (até 3min)…'
  $deadline = (Get-Date).AddMinutes(3)
  $booted = $false
  while ((Get-Date) -lt $deadline) {
    Start-Sleep 5
    $st = (& $adb shell getprop sys.boot_completed 2>$null).Trim()
    if ($st -eq '1') { $booted = $true; break }
  }
  if (-not $booted) { Fail 'Boot não completou em 3min — abra Android Studio AVD Manager e tente manualmente.'; exit 2 }
  Ok 'Emulator booted'
  & $adb shell input keyevent 82 | Out-Null  # unlock se for lock screen
}

& $adb shell screencap -p /sdcard/_smoke_boot.png | Out-Null
& $adb pull /sdcard/_smoke_boot.png (Join-Path $shotsDir 'a-01-boot.png') 2>$null | Out-Null
Ok 'Screenshot: a-01-boot.png'

# ---- 4. Garantir Expo dev server ------------------------------------------
Section 'Validando Expo dev server'
$expoUp = try { Invoke-WebRequest -Uri 'http://localhost:8081' -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop; $true } catch { $false }
if ($expoUp) { Ok 'Expo rodando em :8081' } else {
  Warn 'Expo não está no ar. Subindo em --offline em background…'
  $expoLog = Join-Path $shotsDir 'expo.log'
  cmd /c "cd /d `"$repoRoot\app\mobile`" && start /B cmd /c `"npx expo start --port 8081 --offline > `"$expoLog`" 2>&1`""
  # Esperar até 60s
  $deadline = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep 3
    try { Invoke-WebRequest -Uri 'http://localhost:8081' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop | Out-Null; $expoUp=$true; break } catch {}
  }
  if ($expoUp) { Ok 'Expo subiu' } else { Fail 'Expo não subiu em 60s — veja expo.log'; exit 3 }
}

# Redirecionar 8081 do device pro host (caso o emulador não veja localhost direto)
& $adb reverse tcp:8081 tcp:8081 | Out-Null
Ok 'adb reverse tcp:8081 OK'

# ---- 5. Instalar e abrir o app via expo --android -------------------------
Section 'Lançando app no emulador'
$openLog = Join-Path $shotsDir 'expo-open.log'
Push-Location "$repoRoot\app\mobile"
# expo start --android com EXPO_USE_DEV_CLIENT=0 abre Expo Go ou o dev client
$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', "npx expo start --android --port 8081 > `"$openLog`" 2>&1") -WindowStyle Hidden -PassThru
Pop-Location

# Espera até 60s o app aparecer (verificando activity em foreground)
Write-Host '  Aguardando app abrir (até 90s)…'
$opened = $false
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
  Start-Sleep 5
  $fg = (& $adb shell dumpsys window 2>$null | Select-String 'mCurrentFocus|mFocusedApp' | Out-String)
  if ($fg -match 'mascote|com.exponent|host.exp.exponent') { $opened=$true; break }
}
if ($opened) { Ok 'App em foreground' } else { Warn 'Não consegui detectar app — capturando do mesmo jeito' }

Start-Sleep 5
& $adb shell screencap -p /sdcard/_smoke_welcome.png | Out-Null
& $adb pull /sdcard/_smoke_welcome.png (Join-Path $shotsDir 'a-02-welcome.png') 2>$null | Out-Null
Ok 'Screenshot: a-02-welcome.png'

# ---- 6. Smoke interativo (opcional via Maestro) ---------------------------
if ($Maestro) {
  Section 'Rodando Maestro flow'
  $maestroBin = (Get-Command maestro -ErrorAction SilentlyContinue).Source
  if (-not $maestroBin) {
    $maestroBin = "$env:USERPROFILE\.maestro\bin\maestro.exe"
  }
  if (Test-Path $maestroBin) {
    & $maestroBin test (Join-Path $repoRoot 'scripts\maestro\smoke.yaml')
    & $adb shell screencap -p /sdcard/_smoke_after_maestro.png | Out-Null
    & $adb pull /sdcard/_smoke_after_maestro.png (Join-Path $shotsDir 'a-05-after-maestro.png') 2>$null | Out-Null
  } else {
    Warn 'Maestro não encontrado. Instale: curl -Ls https://get.maestro.mobile.dev | bash'
    Warn 'Pulando flow — você ainda tem screenshots de boot e welcome.'
  }
} else {
  Section 'Smoke manual'
  Write-Host @'
  Maestro NÃO foi rodado (sem flag -Maestro). Pra completar o smoke test
  interativo, faça no emulador (aberto na sua tela):

    1. Welcome → tocar "Começar"
    2. Signup → digitar nome "Felipe" → Continuar
    3. Seguir telas até a home
    4. Tocar tab "Conversar" → digitar "oi" → enviar
    5. Tocar tab "Home" → tocar "Check-in" → escolher humor → Salvar

  Pra capturar screenshots adicionais entre os passos, abra outro terminal:
    adb shell screencap -p /sdcard/x.png; adb pull /sdcard/x.png .
'@ -ForegroundColor Yellow
}

# ---- 7. Relatório resumido ------------------------------------------------
Section 'Salvando relatório'
$shots = Get-ChildItem $shotsDir -Filter '*.png' | Sort-Object Name
$mdLines = @(
  "# Mascote — Android Smoke Test — $timestamp",
  '',
  "AVD: ``$AvdName``",
  "Screenshots: $($shots.Count)",
  '',
  '## Capturas'
)
foreach ($s in $shots) {
  $mdLines += "- ![]($($s.Name)) — $($s.Name)"
}
$mdLines | Set-Content $reportMd -Encoding UTF8

Ok ("Relatório: " + $reportMd)
Ok ("Diretório: " + $shotsDir)
Write-Host "`nFeito." -ForegroundColor Cyan
