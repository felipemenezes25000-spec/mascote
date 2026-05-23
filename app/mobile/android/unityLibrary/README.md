# Unity Android Library — export manual

Este diretório recebe o export **Unity as a Library** quando o runtime Unity estiver pronto.

## Pré-requisitos

- Unity Editor **6000.4.8f1** (Unity 6) — versão pinned em `unity/MascotUnityCore/ProjectSettings/ProjectVersion.txt`
- Android Build Support + NDK 26.1.10909125 instalados no Unity Hub (Hub → Installs → Add Modules)
- JDK 17 (mesmo do Gradle RN — `android/gradle.properties` confirma)

## Passos no Unity Editor

1. Abra `unity/MascotUnityCore/`
2. **File → Build Settings → Android**
3. Marque **Export Project** (não gere APK direto)
4. Export para: `app/mobile/android/unityLibrary/`
5. Confirme que `unityLibrary/build.gradle` e `libs/unity-classes.jar` existem

## Integração Gradle (após export)

Em `android/settings.gradle`, descomente:

```gradle
include ':unityLibrary'
project(':unityLibrary').projectDir = new File(rootProject.projectDir, 'unityLibrary')
```

Em `android/app/build.gradle`:

```gradle
implementation project(':unityLibrary')
```

Em `MainApplication.kt`, registre `UnityMascotPackage()`.

## Bridge stub (sem AAR)

Enquanto o export não existir, o módulo Kotlin em:

`app/src/main/java/app/meumascote/dev/unity/UnityMascotModule.kt`

encaminha JSON RN ↔ Unity em modo stub (`isAvailable = false` até embed real).

## Sincronizar GLBs

```powershell
# Windows
./unity/MascotUnityCore/scripts/sync-mascot-assets.ps1

# macOS/Linux
./unity/MascotUnityCore/scripts/sync-mascot-assets.sh
```

Cria junction/symlink `StreamingAssets/mascot-3d` → `app/mobile/assets/mascot-3d`.

## Variáveis RN

```env
EXPO_PUBLIC_MASCOT_RENDERER=unity
EXPO_PUBLIC_UNITY_ENABLED=true
```

## Limitações conhecidas

- CI não executa Unity Editor — validação estrutural via `unity-ci.yml`
- APK com Unity aumenta ~80–150 MB
- `@azesmway/react-native-unity` é alternativa documentada em `docs/UNITY_ANDROID_INTEGRATION.md`
