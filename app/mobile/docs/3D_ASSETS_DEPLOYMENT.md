# 3D Assets — Deployment & Testing Guide

Guia técnico pra rodar/testar os mascotes 3D Blender no app real.

## 📦 Estado atual da infra

Tudo pronto após sessão 2026-05-23. Arquivos críticos:

```
app/mobile/
├── assets/mascot-3d/                # GLBs Blender modelados
│   ├── {bipo,zip,lulu,aro}.glb      # 4 mascotes base (~1.3MB cada)
│   ├── accessories/                  # 19 acessórios
│   └── README.md
├── src/components/
│   ├── Mascot.tsx                   # wrapper smart (já adaptado)
│   ├── Mascot3DLazyAsset.tsx        # NOVO: escolhe Asset vs Legacy
│   ├── Mascot3DAsset.tsx            # NOVO: useGLTF + bindings
│   └── Mascot3DLazy.tsx             # LEGACY: procedural
├── src/lib/dna/
│   ├── bindings.ts                  # DNA → material+bones (24 tests)
│   └── morphology.ts                # chibi proportions
├── metro.config.js                  # SUPORTA .glb agora
└── docs/3D_ASSETS_DEPLOYMENT.md     # ESTE ARQUIVO
```

## 🎚 Feature flag

`Mascot3DLazyAsset` controlado por env var:
```bash
# Habilitar GLB Blender (default true após 2026-05-23)
EXPO_PUBLIC_USE_GLB_ASSETS=true

# Rollback pro procedural legacy se algum bug em produção
EXPO_PUBLIC_USE_GLB_ASSETS=false
```

Setar em `.env.local` (local dev) ou EAS Secrets (prod build).

## 🧪 Como testar localmente

### Opção 1 — Emulador Android (recomendado pra 3D)

`@react-three/fiber/native` + `expo-gl` funcionam **bem em iOS/Android nativo**
mas têm limitações em Expo Web (canvas vazio se faltar polyfill).

```powershell
# Pré-requisito: Android Studio + AVD instalado
# Setup automático já existe:
./scripts/setup-android-e2e-windows.ps1   # JDK + SDK + AVD pixel_5

# Boot emulador:
./scripts/start-emulator.ps1

# Rodar app:
cd app/mobile
npx expo run:android
```

Esperado: app carrega → mascote 3D aparece com GLB (Bipo pêssego vibrante).
Se aparecer Mascot2D SVG, abrir Metro logs (`npx expo start --tunnel`) e
verificar erros de asset resolution.

### Opção 2 — Expo Go (mais rápido)

```powershell
cd app/mobile
npx expo start
# Scan QR code no app Expo Go (iOS/Android)
```

⚠️ **Caveat**: Expo Go vem com `expo-gl` mas algumas versões podem ter
issue com `useGLTF`. Se app crashar/mascote sumir, setar flag:
```bash
EXPO_PUBLIC_USE_GLB_ASSETS=false npx expo start
```
Fallback procedural funciona em todas as versões.

### Opção 3 — Web (preview rápido, mas limitado)

```bash
cd app/mobile
npx expo start --web
```

⚠️ **Limitação conhecida**: `@react-three/fiber/native` montará canvas mas
**não desenha** em Expo Web sem polyfills. Bypass: use o standalone viewer
HTML `prototipo-mascote-glb-viewer.html` (Three.js puro):

```bash
python -m http.server 8083
# Browse: http://localhost:8083/prototipo-mascote-glb-viewer.html
```

## 🐛 Troubleshooting

### "Unable to resolve module './assets/mascot-3d/bipo.glb'"
- Verifique `metro.config.js` tem `'glb'` em `assetExts`
- Restart Metro: `npx expo start --clear`

### "Cannot find module '@react-three/drei'"
- `npm install @react-three/drei --legacy-peer-deps` (peer dep conflict
  com three@0.166 — flag necessária)

### Mascote aparece como bola branca
- DNA não foi passado pra `Mascot3DAsset`. Check `mascot.dna` no store.
- Material `body_material` ou `accent_material` não foi encontrado — re-gerar GLBs com
  `python scripts/blender/generate_mascot.py` (nomeia materials corretamente).

### Performance lenta no Android antigo (< Android 9)
- Setar `EXPO_PUBLIC_USE_GLB_ASSETS=false` pra cair pro Mascot3DLazy
  procedural (mais leve, mas menos bonito).

## 🚀 Pipeline de update visual

Pra mudar visual do mascote (ex: nova personality, ajuste de proporção):

1. Editar `scripts/blender/generate_mascot.py` (PRESETS dict)
2. Re-gerar GLBs:
   ```bash
   for p in bipo zip lulu aro; do
     "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" \
       --background --python scripts/blender/generate_mascot.py -- \
       --preset $p --out app/mobile/assets/mascot-3d/${p}.glb \
       --render app/mobile/assets/mascot-3d/${p}-preview.png
   done
   ```
3. Commit + push (assets vão no git já, ~1.3MB cada)
4. App pega novo GLB no próximo bundle (sem rebuild app — só refresh JS).

## 📊 Métricas atuais

- **GLB size**: ~1.3MB por mascote (5MB total pros 4)
- **Acessórios**: 10-100KB cada (19 total = ~500KB)
- **Total bundle impact**: ~5.5MB
- **Render budget**: 60fps em Android 9+ (testado em Pixel 5 emulator)
- **Load time**: ~200ms pra mascote base + ~50ms por acessório (cached)
