# fix-realtek-usb-vm.ps1 v2
# PowerShell como ADMINISTRADOR:
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   & "C:\Users\Felipe\Documents\mascote\scripts\ops\vm\fix-realtek-usb-vm.ps1"

$ErrorActionPreference = "Continue"

$VB   = "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"
$VM   = "kali-linux-2026.1-virtualbox-amd64"
$UUID = "5628ccb9-910c-4022-93f8-06e43a055d53"
$PnP  = "USB\VID_0BDA&PID_F179\00E0382D285F"

function Write-Step($msg) {
    Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERRO: Abra PowerShell como Administrador." -ForegroundColor Red
    exit 1
}

Write-Step "1) Matar processos VirtualBox"
taskkill /F /IM VirtualBox.exe /T 2>$null | Out-Null
taskkill /F /IM VirtualBoxVM.exe /T 2>$null | Out-Null
taskkill /F /IM VBoxSVC.exe /T 2>$null | Out-Null
taskkill /F /IM VBoxHeadless.exe /T 2>$null | Out-Null
Start-Sleep -Seconds 5

Write-Step "2) Parar/iniciar VBoxUSBMon (sem Restart-Service)"
Stop-Service VBoxUSBMon -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
sc.exe start VBoxUSBMon
Start-Sleep -Seconds 2
Get-Service VBoxUSBMon -ErrorAction SilentlyContinue | Format-Table Status, Name, DisplayName

if ((Get-Service VBoxUSBMon -ErrorAction SilentlyContinue).Status -ne 'Running') {
    Write-Host "VBoxUSBMon nao subiu. REINICIE O WINDOWS e rode este script de novo." -ForegroundColor Red
    Write-Host "Ou reinstale Extension Pack 7.2.8 como Admin." -ForegroundColor Yellow
}

Write-Step "3) Desligar VM Kali"
& $VB controlvm $VM poweroff 2>$null
Start-Sleep -Seconds 2

Write-Step "4) Desabilitar Realtek no Windows"
Disable-PnpDevice -InstanceId $PnP -Confirm:$false -ErrorAction SilentlyContinue

Write-Step "5) Desativar filtro USB automatico"
& $VB usbfilter modify 0 --target $VM --active off 2>$null

Write-Step "6) Ligar VM"
& $VB startvm $VM
Write-Host "Aguardando 25s..."
Start-Sleep -Seconds 25

Write-Step "7) Anexar USB na VM"
& $VB controlvm $VM usbattach $UUID
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falhou usbattach -> VM: Dispositivos -> USB -> Realtek 802.11n" -ForegroundColor Yellow
    Write-Host "Ou: desconecte o dongle, espere 5s, conecte com a VM aberta." -ForegroundColor Yellow
} else {
    Write-Host "USB anexado!" -ForegroundColor Green
}

Write-Host "`n=== NA KALI ===" -ForegroundColor Green
Write-Host "lsusb | grep -i realtek`niw dev`nairmon-ng check kill`nairmon-ng start wlan0`nairodump-ng --band bg wlan0mon"
