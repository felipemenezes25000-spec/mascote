# MascotUnityCore

Runtime Unity do mascote 3D — contrato JSON compartilhado com React Native (`app/mobile/src/core/mascot-render-contract/`).

## Requisitos

- **Unity 2022.3 LTS** (projeto aponta para `2022.3.62f1` em `ProjectSettings/ProjectVersion.txt`)
- Módulo **Android Build Support** (para export futuro)
- Opcional: **Newtonsoft.Json** — já em `Packages/manifest.json` (`com.unity.nuget.newtonsoft-json`)

## Abrir o projeto

1. Instale [Unity Hub](https://unity.com/download) e o editor **2022.3 LTS**.
2. **Add** → selecione a pasta `unity/MascotUnityCore/`.
3. Na primeira abertura, aguarde import de packages e geração de `.meta`.
4. Abra a cena `Assets/Mascote/Scenes/MascotRoomTestHarness.unity` para debug local.

## Estrutura

```
Assets/Mascote/
  Scripts/Bridge/     ReactNativeBridge, UnityMessageRouter, JsonMessageParser
  Scripts/State/      DTOs + MascotStateStore
  Scripts/Core/       MascotDirector, controllers, TestHarness
  Scripts/Animation/  MascotAnimationController, Blink, Breathing
  Scenes/             MascotRoom, MascotRoomTestHarness
  StreamingAssets/mascot-3d/   GLBs (symlink — ver docs/UNITY_ASSET_PIPELINE.md)
Tests/EditMode/       Testes NUnit (parse JSON, router, director)
```

## Testar sem React Native

### Cena Test Harness

1. Play em `MascotRoomTestHarness.unity`.
2. Use os botões OnGUI (Editor / Development Build) ou o menu de contexto no componente **MascotRoomTestHarness**:
   - **Ping** → envia `ready` (simula handshake)
   - **Apply Sample State** → `state.update` com JSON mínimo
   - **Habit Event** / **Pet Gesture**

### Testes EditMode

Unity → **Window → General → Test Runner** → EditMode → Run All.

Ou CLI (com Unity instalado):

```bash
Unity -batchmode -quit -projectPath unity/MascotUnityCore -runTests -testPlatform editmode -testResults results.xml
```

## Bridge RN ↔ Unity

| Direção | Mecanismo |
|---------|-----------|
| RN → Unity | `UnitySendMessage("MascotUnityBridge", "OnMessageFromReactNative", json)` |
| Unity → RN | `ReactNativeBridge.SendToReactNative(json)` (JNI / módulo nativo no Sprint 3) |

Tipos de mensagem: `docs/UNITY_BRIDGE_CONTRACT.md`.

Versão do core: `OutboundEventDispatcher.CoreVersion` (`unity-core-0.2.0`).

## Build Android (manual — Sprint 3)

1. Sincronize GLBs: `scripts/sync-mascot-assets.ps1` (Windows) ou `.sh` (macOS/Linux).
2. Importe GLBs no Editor (arrastar para `Assets/Mascote/Models/` ou usar GLTFast).
3. **File → Build Settings → Android** → export como biblioteca ou integrar via `@azesmway/react-native-unity`.
4. Siga `docs/UNITY_ANDROID_INTEGRATION.md`.

## O que ainda é manual

- Reimport de cenas stub (GUIDs de `MonoBehaviour` serão reassociados no Editor).
- Import/configuração de Animator a partir dos GLBs.
- Export AAR / embed no app Expo.
- Wiring JNI Android para `postMessage` bidirecional.
