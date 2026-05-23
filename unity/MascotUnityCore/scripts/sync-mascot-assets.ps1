# Cria junction Windows: StreamingAssets/mascot-3d -> app/mobile/assets/mascot-3d
$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$source = Join-Path $repoRoot "app\mobile\assets\mascot-3d"
$target = Join-Path $PSScriptRoot "..\Assets\Mascote\StreamingAssets\mascot-3d"
$target = [System.IO.Path]::GetFullPath($target)

if (-not (Test-Path $source)) {
    Write-Error "Fonte não encontrada: $source"
}

New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null

if (Test-Path $target) {
    $item = Get-Item $target
    if ($item.LinkType -eq "Junction" -or $item.LinkType -eq "SymbolicLink") {
        Write-Host "Junction já existe: $target"
        exit 0
    }
    Write-Error "Destino existe e não é junction: $target"
}

cmd /c mklink /J "`"$target`"" "`"$source`""
Write-Host "OK: $target -> $source"
