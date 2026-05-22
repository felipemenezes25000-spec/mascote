<#
.SYNOPSIS
  Instala JDK 17, Android SDK (CLI), emulador Pixel API 34, Maestro e variáveis de ambiente.
.NOTES
  Rode uma vez: powershell -ExecutionPolicy Bypass -File scripts/setup-android-e2e-windows.ps1
#>
$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

$SdkRoot = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$MaestroHome = Join-Path $env:USERPROFILE '.maestro'
$MaestroBin = Join-Path $MaestroHome 'bin'
$CmdlineRoot = Join-Path $SdkRoot 'cmdline-tools\latest'
$AvdName = 'mascote_api34'

Write-Step 'Instalando JDK 17 (winget)'
winget install --id Microsoft.OpenJDK.17 --accept-package-agreements --accept-source-agreements --disable-interactivity

$Jdk17 = Get-ChildItem 'C:\Program Files\Microsoft\jdk-17*' -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
if (-not $Jdk17) {
  $Jdk17 = Get-ChildItem 'C:\Program Files\Eclipse Adoptium\jdk-17*' -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
}
if (-not $Jdk17) { throw 'JDK 17 não encontrado após instalação.' }

Write-Step 'Instalando Android Platform-Tools (adb)'
winget install --id Google.PlatformTools --accept-package-agreements --accept-source-agreements --disable-interactivity

Write-Step 'Preparando Android SDK em ' + $SdkRoot
New-Item -ItemType Directory -Force -Path $SdkRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $SdkRoot 'cmdline-tools') | Out-Null

$ZipUrl = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip'
$ZipPath = Join-Path $env:TEMP 'commandlinetools-win.zip'
if (-not (Test-Path (Join-Path $CmdlineRoot 'bin\sdkmanager.bat'))) {
  Write-Host "Baixando command-line tools..."
  Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -UseBasicParsing
  $ExtractTmp = Join-Path $env:TEMP 'cmdline-tools-extract'
  if (Test-Path $ExtractTmp) { Remove-Item $ExtractTmp -Recurse -Force }
  Expand-Archive -Path $ZipPath -DestinationPath $ExtractTmp -Force
  $Inner = Join-Path $ExtractTmp 'cmdline-tools'
  if (Test-Path $CmdlineRoot) { Remove-Item $CmdlineRoot -Recurse -Force }
  New-Item -ItemType Directory -Force -Path (Split-Path $CmdlineRoot) | Out-Null
  Move-Item -Path $Inner -Destination $CmdlineRoot
}

$env:JAVA_HOME = $Jdk17.FullName
$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot
$env:Path = @(
  $env:JAVA_HOME + '\bin',
  (Join-Path $SdkRoot 'platform-tools'),
  (Join-Path $CmdlineRoot 'bin'),
  (Join-Path $SdkRoot 'emulator'),
  $env:Path
) -join ';'

$sdkmanager = Join-Path $CmdlineRoot 'bin\sdkmanager.bat'
$avdmanager = Join-Path $CmdlineRoot 'bin\avdmanager.bat'

Write-Step 'Aceitando licenças Android SDK'
$yesPipe = ($null | ForEach-Object { 1..80 | ForEach-Object { 'y' } }) -join "`n"
$yesPipe | & $sdkmanager --licenses 2>&1 | Out-Host

$packages = @(
  'platform-tools', 'emulator',
  'platforms;android-34',
  'system-images;android-34;google_apis;x86_64',
  'build-tools;34.0.0'
)
Write-Step 'Instalando pacotes SDK'
foreach ($pkg in $packages) {
  Write-Host "  sdkmanager: $pkg"
  $yesPipe | & $sdkmanager $pkg 2>&1 | Out-Host
}

Write-Step 'Criando AVD ' + $AvdName
if (-not (Test-Path (Join-Path $SdkRoot 'emulator\emulator.exe'))) {
  throw 'Pacote emulator não instalado. Rode licenças/sdkmanager de novo.'
}
$avdList = @(& (Join-Path $SdkRoot 'emulator\emulator.exe') -list-avds 2>$null)
if ($avdList -notcontains $AvdName) {
  'no' | & $avdmanager create avd -n $AvdName -k 'system-images;android-34;google_apis;x86_64' -d pixel_5 --force 2>&1 | Out-Host
}

Write-Step 'Instalando Maestro CLI'
New-Item -ItemType Directory -Force -Path $MaestroHome | Out-Null
$MaestroZip = Join-Path $env:TEMP 'maestro.zip'
$MaestroUrl = 'https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.5.1/maestro.zip'
if (-not (Test-Path (Join-Path $MaestroBin 'maestro.bat'))) {
  Write-Host 'Baixando Maestro (~200MB)...'
  Invoke-WebRequest -Uri $MaestroUrl -OutFile $MaestroZip -UseBasicParsing
  if (Test-Path (Join-Path $MaestroHome 'extract')) { Remove-Item (Join-Path $MaestroHome 'extract') -Recurse -Force }
  Expand-Archive -Path $MaestroZip -DestinationPath (Join-Path $MaestroHome 'extract') -Force
  $innerBin = Get-ChildItem (Join-Path $MaestroHome 'extract') -Recurse -Filter 'maestro.bat' | Select-Object -First 1
  if ($innerBin) {
    $srcRoot = $innerBin.Directory.Parent.FullName
    if (Test-Path $MaestroBin) { Remove-Item $MaestroBin -Recurse -Force }
    Copy-Item -Path (Join-Path $srcRoot '*') -Destination $MaestroHome -Recurse -Force
  } else {
    throw 'maestro.bat não encontrado no zip.'
  }
}

Write-Step 'Persistindo variáveis de ambiente (usuário)'
[Environment]::SetEnvironmentVariable('JAVA_HOME', $Jdk17.FullName, 'User')
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $SdkRoot, 'User')
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $SdkRoot, 'User')

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$addPaths = @(
  "$($Jdk17.FullName)\bin",
  $MaestroBin,
  (Join-Path $SdkRoot 'platform-tools'),
  (Join-Path $CmdlineRoot 'bin'),
  (Join-Path $SdkRoot 'emulator')
)
foreach ($p in $addPaths) {
  if ($userPath -notlike "*$p*") { $userPath = "$p;$userPath" }
}
[Environment]::SetEnvironmentVariable('Path', $userPath, 'User')

Write-Step 'Verificação'
& (Join-Path $MaestroBin 'maestro.bat') --version
& (Join-Path $SdkRoot 'platform-tools\adb.exe') version
Write-Host "`nOK. Próximo passo (nova janela de terminal):" -ForegroundColor Green
Write-Host "  cd app\mobile"
Write-Host "  .\scripts\start-emulator.ps1"
Write-Host "  npm run android    # instala o dev client no emulador"
Write-Host "  npm run test:e2e:critical"
