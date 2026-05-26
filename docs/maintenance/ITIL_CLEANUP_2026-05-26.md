# Relatório de organização ITIL — 2026-05-26

Escopo: `C:\Users\Felipe\Documents\mascote`  
Política: exclusão de lixo não rastreado; **nenhum arquivo rastreado apagado**.

## Raiz do repositório (antes → depois)

| Ação | Itens |
|---|---|
| **Movidos** | Scripts Wi-Fi/VM → `scripts/ops/` |
| **Movidos (git)** | `3d-70`…`3d-79` PNG → `docs/design/creature-evolution/3d-prototypes/` |
| **Movidos (git)** | `prototipo-mascote-glb-viewer.html` → `docs/design/prototypes/` |
| **Apagados** | `hash.txt`, `wordlist.txt`, `proto-server.log`, `proto-server2.log` |
| **Preservados localmente (gitignored)** | `scripts/ops/network/artifacts/rtl8188fu.tar`, `rtl8188fu/` |

A raiz ficou apenas com: `app/`, `docs/`, `scripts/`, `unity/`, `.github/`, docs legais e `package.json`.

## Nova estrutura `scripts/ops/`

```
scripts/ops/
├── README.md
├── network/
│   ├── update-wifi-driver.sh
│   ├── update-wifi-driver-build-only.sh
│   ├── fluxion-audit.sh
│   ├── guest-build.sh
│   └── artifacts/          # gitignored
│       ├── rtl8188fu.tar
│       └── rtl8188fu/
└── vm/
    └── fix-realtek-usb-vm.ps1
```

## Governança

- `.gitignore` atualizado para bloquear scripts/artefatos soltos na raiz e em `artifacts/`.
- `scripts/README.md` e `scripts/ops/README.md` documentam convenções (`kebab-case`, sem arquivos na raiz).

## Não alterado (por design)

- GLBs Unity/mobile e pipeline Android (alterações de trabalho em andamento).
- `scripts/blender/run_all_glbs.py` mantido (restaurado no índice; não é lixo).

## Segunda passada — varredura profunda

| Ação | Itens |
|---|---|
| Apagados | 22 arquivos `.tmp` órfãos em `app/mobile/src/**` e `app/mobile/tests/**` (versões antigas duplicadas, não rastreadas) |
| Apagados | `app/mobile/expo-web.log`, `app/mobile/expo-web-err.log` |
| Apagados (caches) | `app/mobile/coverage/`, `app/mobile/dist/`, `app/mobile/android/app/build/` |
| Reforçado | `.gitignore` agora cobre recursivamente `**/*.tmp`, `**/*.bak`, `**/*.swp`, `**/*.swo` |

## Próximo passo opcional

Commitar o lote de organização separado das mudanças de assets 3D, se quiser histórico limpo no Git.
