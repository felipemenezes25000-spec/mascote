# scripts/ops/

Scripts operacionais **fora do fluxo do app Mascote** (VM, rede, drivers). Não rodam em CI do produto.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `network/` | Wi-Fi, drivers Realtek, auditoria Fluxion (Kali) |
| `network/artifacts/` | Tar/fontes do driver (`rtl8188fu`) — **local, gitignored** |
| `vm/` | VirtualBox / passthrough USB para VM Kali |

## Uso rápido

```powershell
# Corrigir USB Realtek na VM Kali (Windows, admin)
pwsh -File scripts/ops/vm/fix-realtek-usb-vm.ps1
```

```bash
# Na VM Kali: instalar driver rtl8188fu
sudo bash scripts/ops/network/update-wifi-driver.sh

# Copiar tar offline antes (se sem rede):
# scp scripts/ops/network/artifacts/rtl8188fu.tar kali@vm:/tmp/
```

```bash
# Auditoria Fluxion (Kali, root)
sudo bash scripts/ops/network/fluxion-audit.sh prepare
```

## Convenções

- Nomes em **kebab-case** (`update-wifi-driver.sh`, não `update_wifi_driver.sh`)
- Nada de scripts soltos na **raiz do repo**
- Artefatos grandes (>1MB, clones, `.tar`) ficam em `network/artifacts/` e não entram no Git
- Scripts de **QA do app** continuam em [`../README.md`](../README.md) (`android-smoke.ps1`, Maestro)
