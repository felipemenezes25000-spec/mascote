# Wire unityLibrary no projeto Android nativo (pós-export Unity Editor).
# Uso: powershell -ExecutionPolicy Bypass -File scripts/wire-unity-android.ps1
# Requer export em app/mobile/android/unityLibrary/ (build.gradle presente).

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Android = Join-Path $Root 'android'
$UnityLib = Join-Path $Android 'unityLibrary'
$Marker = Join-Path $UnityLib 'build.gradle'

if (-not (Test-Path $Marker)) {
  Write-Host 'BLOCKED: unityLibrary/build.gradle nao encontrado.' -ForegroundColor Yellow
  Write-Host 'Exporte no Unity Editor (Runbook passo 8) para:' -ForegroundColor Yellow
  Write-Host "  $UnityLib" -ForegroundColor Cyan
  Write-Host ''
  Write-Host 'Modo stub RN continua funcional com EXPO_PUBLIC_UNITY_ENABLED=true (sem AAR).'
  exit 1
}

Write-Host 'OK: unityLibrary export detectado.' -ForegroundColor Green

# --- settings.gradle ---
$Settings = Join-Path $Android 'settings.gradle'
$settingsText = Get-Content $Settings -Raw
if ($settingsText -notmatch "include ':unityLibrary'") {
  $settingsText = $settingsText -replace "include ':app'", @"
include ':app'
include ':unityLibrary'
project(':unityLibrary').projectDir = new File(rootProject.projectDir, 'unityLibrary')
"@
  Set-Content -Path $Settings -Value $settingsText -NoNewline
  Write-Host '  + settings.gradle: include unityLibrary'
} else {
  Write-Host '  = settings.gradle ja inclui unityLibrary'
}

# --- app/build.gradle ---
$AppGradle = Join-Path $Android 'app\build.gradle'
$gradleText = Get-Content $AppGradle -Raw
if ($gradleText -notmatch "implementation project\(':unityLibrary'\)") {
  $gradleText = $gradleText -replace 'dependencies\s*\{', @"
dependencies {
    implementation project(':unityLibrary')
"@
  Set-Content -Path $AppGradle -Value $gradleText -NoNewline
  Write-Host '  + app/build.gradle: implementation unityLibrary'
} else {
  Write-Host '  = app/build.gradle ja referencia unityLibrary'
}

# --- AndroidManifest.xml ---
$Manifest = Join-Path $Android 'app\src\main\AndroidManifest.xml'
$manifestText = Get-Content $Manifest -Raw
$activitySnippet = @'
    <activity android:name="com.unity3d.player.UnityPlayerActivity"
              android:theme="@style/UnityThemeSelector"
              android:configChanges="mcc|mnc|locale|touchscreen|keyboard|keyboardHidden|navigation|orientation|screenLayout|uiMode|screenSize|smallestScreenSize|fontScale|layoutDirection|density"
              android:hardwareAccelerated="true" />
'@
if ($manifestText -notmatch 'UnityPlayerActivity') {
  $manifestText = $manifestText -replace '</application>', "$activitySnippet`n  </application>"
  Set-Content -Path $Manifest -Value $manifestText -NoNewline
  Write-Host '  + AndroidManifest: UnityPlayerActivity'
} else {
  Write-Host '  = AndroidManifest ja declara UnityPlayerActivity'
}

Write-Host ''
Write-Host 'Proximos passos:' -ForegroundColor Cyan
Write-Host '  1. cd app/mobile && npx expo run:android'
Write-Host '  2. .env.local: EXPO_PUBLIC_UNITY_ENABLED=true (+ opcional EXPO_PUBLIC_MASCOT_RENDERER=unity)'
Write-Host '  3. Abrir /mascot-room e verificar nativeEmbedded: true no painel debug'
