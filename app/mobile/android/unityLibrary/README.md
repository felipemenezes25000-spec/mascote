# Unity Android Library — export manual

Este diretório recebe o export **Unity as a Library** quando o runtime Unity estiver pronto.

> **Sem `build.gradle` aqui:** o app compila normalmente em modo stub (`UnityMascotModule` log-only).
> Não inclua `:unityLibrary` no Gradle até o export existir — referência morta quebra o build.

## Pré-requisitos

- Unity Editor **6000.4.8f1** (Unity 6) — versão pinned em `unity/MascotUnityCore/ProjectSettings/ProjectVersion.txt`
- Android Build Support + NDK 26.1.10909125 instalados no Unity Hub (Hub → Installs → Add Modules)
- JDK 17 (mesmo do Gradle RN — `android/gradle.properties` confirma)

## Passos no Unity Editor

1. Abra `unity/MascotUnityCore/` (ver `docs/UNITY_RUNBOOK_v3.md` passos atuais)
2. **File → Build Settings → Android**
3. Marque **Export Project** (não gere APK direto)
4. Export para: `app/mobile/android/unityLibrary_export/` (temporário)
5. Copie o conteúdo interno `unityLibrary_export/unityLibrary/*` → `app/mobile/android/unityLibrary/`
6. Confirme que `unityLibrary/build.gradle` e `libs/unity-classes.jar` existem

## Integração Gradle (após export)

Automático via script (recomendado):

```powershell
cd app/mobile
powershell -ExecutionPolicy Bypass -File scripts/wire-unity-android.ps1
```

Ou manualmente em `android/settings.gradle`:

```gradle
include ':unityLibrary'
project(':unityLibrary').projectDir = new File(rootProject.projectDir, 'unityLibrary')
```

Em `android/app/build.gradle`:

```gradle
implementation project(':unityLibrary')
```

Em `AndroidManifest.xml` (dentro de `<application>`):

```xml
<activity android:name="com.unity3d.player.UnityPlayerActivity"
          android:theme="@style/UnityThemeSelector"
          android:configChanges="mcc|mnc|locale|touchscreen|keyboard|keyboardHidden|navigation|orientation|screenLayout|uiMode|screenSize|smallestScreenSize|fontScale|layoutDirection|density"
          android:hardwareAccelerated="true" />
```

O plugin Expo `plugins/withUnityAndroid.js` aplica o mesmo wiring no `npx expo prebuild` quando `build.gradle` já existe.

`MainApplication.kt` já registra `UnityMascotPackage()`.

## Bridge stub (sem AAR)

Enquanto o export não existir, o módulo Kotlin em:

`app/src/main/java/app/meumascote/dev/unity/UnityMascotModule.kt`

funciona em modo stub (`embedded=false`, `isAvailable=false`). O JS simula `ready` para desenvolver o contrato RN ↔ Unity.

Com AAR embutido, `postMessage` chama `UnityPlayer.UnitySendMessage("MascotUnityBridge", "OnMessageFromReactNative", json)` via reflexão.

## Sincronizar GLBs

```powershell
# Windows
./unity/MascotUnityCore/scripts/sync-mascot-assets.ps1

# macOS/Linux
./unity/MascotUnityCore/scripts/sync-mascot-assets.sh
```

Cria junction/symlink `StreamingAssets/mascot-3d` → `app/mobile/assets/mascot-3d`.

## Variáveis RN (dev local)

Crie `app/mobile/.env.local`:

```env
EXPO_PUBLIC_UNITY_ENABLED=true
EXPO_PUBLIC_UNITY_DEBUG_PANEL=true
```

Opcional — Unity em todo o app (não só `/mascot-room`):

```env
EXPO_PUBLIC_MASCOT_RENDERER=unity
```

Build EAS com Unity: `eas build --platform android --profile preview-unity`

## Limitações conhecidas

- CI não executa Unity Editor — validação estrutural via `unity-ci.yml`
- APK com Unity aumenta ~80–150 MB
- View Unity no RN ainda é placeholder visual até embed + UnityView nativa
- `@azesmway/react-native-unity` é alternativa documentada em `docs/UNITY_ANDROID_INTEGRATION.md`
