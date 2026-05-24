# Integração Unity Android — Mascote mobile

## Visão geral

O app Expo/RN embute Unity via **Unity as a Library** exportado para `android/unityLibrary/`. Enquanto o AAR real não existir, um **módulo Kotlin stub** (`UnityMascotModule`) encaminha JSON e permite desenvolvimento do contrato RN.

## Pré-requisitos

- Unity **6000.4.8f1** (Unity 6) + Android Build Support + NDK 26.1.10909125
- Android Studio / JDK 17
- Expo dev client ou build nativo (`npx expo run:android`)

## Passo a passo

### 1. Sincronizar GLBs

```powershell
./unity/MascotUnityCore/scripts/sync-mascot-assets.ps1
```

Cria junction `StreamingAssets/mascot-3d` → `app/mobile/assets/mascot-3d` (22 GLBs).

### 2. Export Unity as Library

1. Abra `unity/MascotUnityCore/`
2. **File → Build Settings → Android**
3. Marque **Export Project**
4. Destino: `app/mobile/android/unityLibrary/`

Detalhes: `android/unityLibrary/README.md`

### 3. Gradle

Após export, rode o script de wiring:

```powershell
cd app/mobile
powershell -ExecutionPolicy Bypass -File scripts/wire-unity-android.ps1
```

Ou descomente manualmente em `android/settings.gradle`:

```gradle
include ':unityLibrary'
project(':unityLibrary').projectDir = new File(rootProject.projectDir, 'unityLibrary')
```

Em `android/app/build.gradle`:

```gradle
implementation project(':unityLibrary')
```

### 4. Bridge nativa

| Camada | Arquivo |
|--------|---------|
| RN | `src/components/unity/UnityMascotBridge.ts` |
| Android | `android/.../unity/UnityMascotModule.kt` |
| Unity C# | `ReactNativeBridge.cs` → `OnMessageFromReactNative` |

Mensagens: ver `docs/UNITY_BRIDGE_CONTRACT.md`.

### 5. Expo config plugin

`app/mobile/plugins/withUnityAndroid.js` está registrado em `app.json`.

Após alterar plugins:

```bash
cd app/mobile
npx expo prebuild --platform android --clean
```

### 6. Variáveis de ambiente

Crie `app/mobile/.env.local` para dev local (home Three.js, quarto Unity):

```env
EXPO_PUBLIC_UNITY_ENABLED=true
EXPO_PUBLIC_UNITY_DEBUG_PANEL=true
```

Unity em todo o app:

```env
EXPO_PUBLIC_MASCOT_RENDERER=unity
EXPO_PUBLIC_UNITY_ENABLED=true
EXPO_PUBLIC_UNITY_QUALITY=auto
EXPO_PUBLIC_UNITY_DEBUG_PANEL=true
EXPO_PUBLIC_UNITY_SIMULATE_FAILURE=false
```

A rota `/mascot-room` usa `preferUnity` — basta `EXPO_PUBLIC_UNITY_ENABLED=true` mesmo com renderer global `three`.

### 7. Testar fallback

Com `EXPO_PUBLIC_UNITY_SIMULATE_FAILURE=true`, `MascotRenderer` cai para Three.js (`Mascot.tsx`).

## Alternativa: @azesmway/react-native-unity

1. `npm install @azesmway/react-native-unity`
2. Export Unity para pasta esperada pelo pacote
3. Substituir `UnityMascotView` por componente do pacote
4. Manter `buildUnityMascotState` e `unityMessageMapper` inalterados

## Limitações atuais

- CI **não** compila AAR Unity (sem Editor no runner)
- `UnityMascotModule.isAvailable()` retorna `false` até embed real (`embedded=false` no stub)
- View Unity ainda é placeholder visual; runtime 3D exige export + UnityView nativa
- APK com Unity: +80–150 MB estimados

## Sprint 3 — o que funciona sem Unity Editor

| Camada | Sem AAR | Com AAR (após passo 8 runbook) |
|--------|---------|--------------------------------|
| Contrato `UnityMascotState` v1 | ✅ testes Vitest | ✅ |
| `UnityMascotBridge` + stub `ready` | ✅ | ✅ mensagens reais |
| `UnityMascotModule.kt` | ✅ stub log | ✅ `UnitySendMessage` |
| `/mascot-room` + debug panel | ✅ | ✅ |
| `MascotRenderer` fallback Three.js | ✅ | ✅ |
| Gradle `:unityLibrary` | ❌ (intencional) | ✅ via `wire-unity-android.ps1` |
| Render 3D Unity na tela | ❌ | ⚠️ placeholder RN (próximo sprint) |

## Troubleshooting

| Sintoma | Ação |
|---------|------|
| `UnityMascotModule` undefined | Verificar `UnityMascotPackage` em `MainApplication.kt` |
| GLB não encontrado | Rodar `sync-mascot-assets.ps1` |
| Crash ao abrir Unity | Conferir `minSdkVersion` compatível com Unity export |
| Sem mensagens RN→Unity | Logcat `[UnityMascotBridge]` / `ReactNativeBridge` |
