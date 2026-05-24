# Unity Runbook — passo a passo no Editor

Este documento é o checklist manual para você (Felipe) executar no Unity
Editor. Tudo que NÃO dá pra eu fazer via filesystem está aqui.

> **Versão Unity:** `6000.4.8f1` (já instalada). Confirmar em
> `unity/MascotUnityCore/ProjectSettings/ProjectVersion.txt`.

---

## 1) Abrir o projeto pela primeira vez

1. Unity Hub → **Open** → escolha `C:\Users\Felipe\Documents\mascote\unity\MascotUnityCore`.
2. Se aparecer aviso "Editor version 6000.4.8f1 not found", clique **Install with Unity Hub** (já está provavelmente — o Hub detecta).
3. Aguarde **Library/ ser gerada** — primeira vez demora 5-15 min em SSD.
4. Console deve aparecer SEM erros vermelhos.
   - Se houver warning "Newtonsoft.Json missing", abrir **Window → Package Manager → +`com.unity.nuget.newtonsoft-json` → Install 3.2.1**.
   - Se houver warning "URP not installed", **Package Manager → Universal RP → Install 17.x**.

## 2) Importar 4 GLBs base como prefabs

Os arquivos estão em `app/mobile/assets/mascot-3d/`. Use o script de sync:

```powershell
# PowerShell, raiz do repo
cd unity\MascotUnityCore
.\scripts\sync-mascot-assets.ps1
```

Isso copia os GLBs para `Assets/Mascote/StreamingAssets/mascot-3d/` (assets brutos)
e `Assets/Mascote/Models/` (importáveis pelo Editor).

Para cada um dos 4 GLBs base (`bipo`, `zip`, `lulu`, `aro`):
1. Selecione o asset no Project view.
2. Inspector → **Model** tab:
   - Scale Factor: `1` (manter)
   - Use File Scale: `On`
   - Mesh Compression: `Low`
   - Read/Write: `Off` (a menos que precise procedural alterations)
3. Inspector → **Rig** tab:
   - Animation Type: **Generic** (não Humanoid — mascote não é humanoid)
   - Avatar Definition: **Create From This Model**
   - Optimize Game Objects: **Off** (mantém transforms acessíveis pros sockets)
4. Inspector → **Materials** tab:
   - Material Creation Mode: **Standard (Built-in)** ou **URP/Lit** (URP em uso)
   - Use Embedded Materials → **Extract Materials** para `Assets/Mascote/Materials/`
5. **Apply**.
6. Drag the model into `Assets/Mascote/Prefabs/Mascots/` para criar o prefab.

## 3) Criar AccessoryDefinition ScriptableObjects (18)

No Project view:
1. Right-click `Assets/Mascote/Data/Accessories/` → **Create → Mascote → Accessory Definition**.
2. Nome do asset: igual ao `assetKey` (ex: `cap_classic.asset`).
3. Preencher campos:
   - `assetKey`: `cap_classic`
   - `glbFileName`: `cap_classic`
   - `slot`: `hat`
   - `defaultBone`: `head`
   - `defaultScale`: `1`
   - `prefab` (opcional): se já importou o GLB do cap, arraste o prefab aqui.
4. Repita para os 18 itens — referência completa em `AccessoryRegistry.cs:65-83`.

> **Atalho:** se preferir, deixe o `AccessoryRegistry` ser source-of-truth e
> instancie acessórios via código (`SpawnAccessory`). ScriptableObjects são
> opcionais para Sprint 2.

## 4) Configurar sockets no prefab Bipo (replicar pros outros)

1. Abra o prefab `Bipo.prefab` em isolamento (double-click).
2. Selecione o **root** do mascote.
3. **Hierarchy** view → Right-click → Create Empty → renomeie `Socket_Hat`.
4. Posicione no topo da cabeça (use Move tool).
5. Repita para: `Socket_Glasses`, `Socket_Neck`, `Socket_Back`, `Socket_Ear_L`, `Socket_Ear_R`, `Socket_Aura`.
6. **Apply** mudanças ao prefab.
7. Drag o prefab pro array `attachRoot` no `MascotAccessoryController` (componente do mascote).

## 5) Animator Controller mínimo

Já existe `Assets/Mascote/Animations/MascotAnimatorStub.controller`. Para
torná-lo funcional:

1. Double-click → abre Animator window.
2. Adicione **12 states** (já mapeados em `AnimationStateMap.cs:13-25`):
   - `Idle`, `Blink`, `Smile`, `Sad`, `Excited`, `Sleep`, `Wave`, `Hatch`, `Celebrate`, `Rest`, `Observe`, `Stretch`.
3. Adicione **parameter trigger** chamado `OneShot` (Trigger type).
4. Adicione **parameter string** chamado `OneShotName` (não suportado direto — usar int hash via `AnimationStateMap.ResolveClip`).
5. Para cada one-shot state, **Transition from Any State** com condição `OneShot trigger`.
6. Defina **Animation Clips** dummy (1 frame loops) até GLBs reais terem clips.
   - **Window → Animation → Create** → grava 1 frame em cada state.
7. **Apply Root Motion: OFF** em todos os clips.

> **Atalho rápido:** se já tem rig real com clips nomeados (`bipo_idle.anim` etc.),
> drag direto na window do Animator e o Unity nomeia states automaticamente.

## 6) Cena `MascotRoom.unity` produtiva

1. Abra `Assets/Mascote/Scenes/MascotRoom.unity`.
2. Verifique se há um GameObject `MascotUnityBridge` na raiz — `ReactNativeBridge.cs` se anexa a ele (DontDestroyOnLoad).
3. Adicione (se não houver):
   - `Directional Light` (rotation -45,-45,0; intensity 1.2)
   - `Main Camera` (position 0,1.5,-3; orthographic OFF, fov 45)
   - `MascotRoot` (GameObject vazio com `MascotController` + `MascotMorphologyController` + `MascotAccessoryController` + `MascotAnimationController` + `IdleBehaviorController` + `LookAtTouchController`)
   - `MascotDirector` GameObject com `MascotDirector` component referenciando os controllers acima
   - `MascotEnvironment` GameObject com `MascotEnvironmentController` (cena ambient/lighting)
4. **Save** (Ctrl+S).
5. **Play** — `ReactNativeBridge` enviará `ready` no Console.

## 7) Test Harness — interagir sem RN

1. Abra `Assets/Mascote/Scenes/MascotRoomTestHarness.unity`.
2. **Play**. O `MascotRoomTestHarness` script expõe botões no Game view:
   - Apply Bipo / Zip / Lulu / Aro
   - Mood: sad / happy / excited / exhausted
   - Habit reaction: water / sleep / exercise / meditation / reading
   - Level up / Phase advance / Mutation legendary
   - Reduce motion ON/OFF
   - Quality low / medium / high
3. Cada botão chama o método correspondente em `MascotDirector` com um JSON de exemplo (ver `Tests/EditMode/Fixtures/sample-state.json`).

## 8) Build Android Library

Pré-requisitos:
- Android SDK + NDK 26.1.10909125 instalados (Hub → Installs → Add Modules).
- JDK incluído (Hub default).

Passos:
1. **File → Build Settings**.
2. **Platform → Android → Switch Platform**.
3. **Player Settings → Other Settings**:
   - Scripting Backend: **IL2CPP**
   - Target Architectures: **ARMv7 + ARM64** (ON ambos)
   - Minimum API Level: **Android 6.0 'Marshmallow' (API 23)** — bate com `app/mobile/android/build.gradle minSdkVersion 23`
   - Target API Level: **Highest installed**
4. **Player Settings → Publishing Settings → Build**:
   - **Export Project**: ON ← crítico, gera estrutura Gradle
   - **Symlink Sources**: OFF
5. **Build Settings → Build** → escolha pasta `unityExport/`.
6. Aguarde build (10-30 min primeira vez — IL2CPP é lento).
7. Saída esperada: `unityExport/unityLibrary/` com `build.gradle`, src/, libs/.

## 9) Integrar `unityLibrary` no app RN

Após build:

1. Mova/copie `unityExport/unityLibrary/` → `app/mobile/android/unityLibrary/`.
2. Edite `app/mobile/android/settings.gradle` — adicione:
   ```gradle
   include ':unityLibrary'
   project(':unityLibrary').projectDir = new File('unityLibrary')
   ```
3. Edite `app/mobile/android/app/build.gradle` — em `dependencies`:
   ```gradle
   implementation project(':unityLibrary')
   ```
4. Edite `app/mobile/android/app/src/main/AndroidManifest.xml` — adicione dentro de `<application>`:
   ```xml
   <activity android:name="com.unity3d.player.UnityPlayerActivity"
             android:theme="@style/UnityThemeSelector"
             android:configChanges="mcc|mnc|locale|touchscreen|keyboard|keyboardHidden|navigation|orientation|screenLayout|uiMode|screenSize|smallestScreenSize|fontScale|layoutDirection|density"
             android:hardwareAccelerated="true" />
   ```
5. Crie `app/mobile/android/app/src/main/java/app/meumascote/dev/unity/UnityMascotModule.kt` — usar template em `docs/UNITY_ANDROID_INTEGRATION.md` (próximo doc).
6. Registre o package em `MainApplication.kt`:
   ```kotlin
   override fun getPackages(): List<ReactPackage> =
       PackageList(this).packages + listOf(UnityMascotPackage())
   ```
7. `eas build --platform android --profile preview-unity` — testar.

## 10) Verificação fim-a-fim

Set:
```
EXPO_PUBLIC_MASCOT_RENDERER=unity
EXPO_PUBLIC_UNITY_ENABLED=true
EXPO_PUBLIC_UNITY_DEBUG_PANEL=true
```

1. Abre app → home Three.js normal.
2. Tap em "Visitar o quarto →" (em /mascot).
3. /mascot-room abre → debug log mostra `← ready (version=mascot-core-X.X)`.
4. Tap nos botões Test → log mostra `→ event.play habit:water` + reaction visível.
5. Setar `EXPO_PUBLIC_UNITY_SIMULATE_FAILURE=true` → deve cair pra Three em < 2s.

Done.

---

## Troubleshooting

| Sintoma | Causa provável | Fix |
|---------|-----------------|-----|
| Console: `Newtonsoft.Json type not found` | Package missing | Package Manager → Install `com.unity.nuget.newtonsoft-json` |
| Mascot não aparece em Play | `mascotController.mascotRoot` not assigned | Selecione MascotRoot child no Inspector e arraste pro slot |
| Animator parado | Trigger `OneShot` não disparado | `MascotAnimationController.PlayOneShot` precisa chamar `animator.SetTrigger("OneShot")` — verificar |
| RN não recebe `ready` | Bridge GameObject mal nomeado | DEVE ser `MascotUnityBridge` (case-sensitive) |
| Build Android falha em IL2CPP | NDK não instalado | Hub → Installs → Add Modules → Android Build Support → NDK 26.1.10909125 |
| Crash no boot Android | UnityPlayer activity não declarada | `AndroidManifest.xml` precisa de `UnityPlayerActivity` declarada |
| APK enorme (+200MB) | Includes desnecessários | Player Settings → Stripping Level: High; remover modulos não usados em Packages/manifest.json |
