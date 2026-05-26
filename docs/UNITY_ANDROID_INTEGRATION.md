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

**Recomendado (novo, automatizado — slice 2026-05-25):**

1. Abra `unity/MascotUnityCore/` no Unity Editor 6.0
2. Menu **`Mascote → 📦 Build Android Library`**
3. Confirmar diálogo → aguardar export (~1-2 min)
4. Validar: arquivo `app/mobile/android/unityLibrary/build.gradle` deve existir

O script `Assets/Mascote/Editor/AndroidBuildPipeline.cs` aplica automaticamente:
- Switch pra Android build target
- Player Settings mobile (IL2CPP, ARM64+ARMv7, minSdk=24, linear color, strip Medium)
- Validação da cena `MascotRoom.unity` no Build Settings
- Sanity check dos 4 prefabs (`bipo`, `zip`, `lulu`, `aro`)
- Cleanup do export anterior antes de gerar novo

**Manual (legacy fallback):**

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
| Android Module | `android/.../unity/UnityMascotModule.kt` |
| Android Lifecycle | `android/.../unity/UnityPlayerActivityHelper.kt` (slice 2026-05-25) |
| Android Activity | `android/.../MainActivity.kt` — delega lifecycle ao helper |
| Unity C# | `ReactNativeBridge.cs` → `OnMessageFromReactNative` |

Mensagens: ver `docs/UNITY_BRIDGE_CONTRACT.md`.

#### Lifecycle delegation (slice 2026-05-25)

`MainActivity` agora delega os seguintes callbacks pra `UnityPlayerActivityHelper`:

- `onResume` → `UnityPlayer.resume()`
- `onPause` → `UnityPlayer.pause()`
- `onDestroy` → `UnityPlayer.quit()`
- `onLowMemory` → `UnityPlayer.lowMemory()`
- `onTrimMemory(level)` → `UnityPlayer.trimMemory(level)`
- `onWindowFocusChanged(hasFocus)` → `UnityPlayer.windowFocusChanged(hasFocus)`
- `onConfigurationChanged(newConfig)` → `UnityPlayer.configurationChanged(newConfig)`

O helper é **reflection-safe**: se `com.unity3d.player.UnityPlayer` não estiver no
classpath (build sem AAR), TODO método vira NO-OP silent. Isso garante que:

1. Build atual sem AAR continua funcionando (ZERO regressão)
2. Build com AAR não vaza memória / não trava em background
3. Mesmo padrão de [`UnityMascotModule.isUnityEmbedded`](../app/mobile/android/app/src/main/java/app/meumascote/dev/unity/UnityMascotModule.kt) — single source of truth

Logs `[UnityPlayerHelper]` no Logcat indicam que o helper está ativo (modo DEBUG).

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
- iOS: estrutura preparada mas bridge nativo ainda não implementado (slice futuro)

## Checklist manual de Felipe (após esse slice — 2026-05-25)

Pra ativar Unity de verdade no Android, fazer **uma vez**:

1. **Verificar prefabs nos 4 mascotes** (já existem — só validar):
   - Abrir `unity/MascotUnityCore/` no Unity Editor 6.0
   - Inspect `Assets/Mascote/Prefabs/Mascots/{bipo,zip,lulu,aro}.prefab`
   - Confirmar bones nomeados: `head`, `body`, `eye_L`, `eye_R`, `arm_L`, `arm_R`, `leg_L`, `leg_R`
   - Se algum quebrado: re-importar GLB de `Assets/StreamingAssets/mascot-3d/` e recriar

2. **Configurar cena `MascotRoom.unity`** (passo manual obrigatório):
   - Validar Camera + Directional Light + Point Light na cena
   - Adicionar (se não tiver) GameObject vazio `MascotUnityBridge` com `ReactNativeBridge` component anexado
   - Adicionar GameObject `MascotInstance` com `MascotDirector` anexado e prefab inicial assignado
   - `File → Save`
   - `File → Build Settings → Add Open Scenes` (cena precisa estar no índice 0)

3. **Buildar unityLibrary**:
   - Menu `Mascote → 📦 Build Android Library`
   - Aguardar ~1-2 min
   - Validar `app/mobile/android/unityLibrary/build.gradle` existe

4. **Wirar no Android nativo**:
   ```powershell
   cd app/mobile
   powershell -ExecutionPolicy Bypass -File scripts/wire-unity-android.ps1
   ```

5. **Buildar + testar**:
   ```powershell
   cd app/mobile
   # criar .env.local com:
   # EXPO_PUBLIC_UNITY_ENABLED=true
   # EXPO_PUBLIC_UNITY_DEBUG_PANEL=true
   npx expo run:android
   ```
   Abrir `/mascot-room` → debug panel deve mostrar `nativeEmbedded: true` + `version: android-embedded-0.3.0`

6. **Smoke test do lifecycle**:
   - Abrir app, navegar pra `/mascot-room`
   - Mandar pra background (botão home)
   - Esperar 10s
   - Voltar pro app
   - Mascote deve continuar renderizando, sem crash, sem ANR
   - Logcat deve mostrar `[UnityPlayerHelper] UnityPlayer.pause() OK` + `UnityPlayer.resume() OK`

## Rollback

Se algo der errado em produção:

| Severidade | Ação |
|---|---|
| Bug visual | Definir `EXPO_PUBLIC_UNITY_ENABLED=false` no build → cai pro R3F GLB (status atual) |
| Crash repetível | Reverter o commit do slice (helper + MainActivity patch) e re-shipar |
| AAR corrompido | `rm -rf app/mobile/android/unityLibrary` + rebuild via Editor menu |

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
