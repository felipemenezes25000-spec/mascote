# Unity Runbook v2 — passo a passo no Editor (corrigido)

> **Substitui** `UNITY_RUNBOOK.md`. Corrige discrepâncias de versão, paths que não existiam, e documenta o **prep automatizado** já aplicado pelo agente em 2026-05-23.

---

## Estado atual do projeto (snapshot 2026-05-23 pré-Editor)

| Item | Status |
|---|---|
| Unity Editor pinned | `6000.4.8f1` (Unity 6) ✅ (commit `b9ba8e1`) |
| GLBs base (4) | `app/mobile/assets/mascot-3d/{bipo,zip,lulu,aro}.glb` ✅ |
| GLBs acessórios (18) | `app/mobile/assets/mascot-3d/accessories/*.glb` ✅ |
| Junction StreamingAssets | `Assets/Mascote/StreamingAssets/mascot-3d` → fonte ✅ |
| Pasta `Models/` | Criada (vazia, `.gitkeep`) ✅ |
| Pasta `Data/Accessories/` | Criada (vazia, `.gitkeep`) ✅ |
| Pasta `Prefabs/Mascots/` | Criada (vazia, `.gitkeep`) ✅ |
| Pasta `Editor/` | Criada com asmdef + AccessoryAssetGenerator.cs ✅ |
| URP no manifest.json | `17.0.4` adicionado — Package Manager auto-resolve no open ✅ |
| Newtonsoft.Json | `3.2.1` já estava ✅ |
| Scripts C# (27) | Em `Assets/Mascote/Scripts/` ✅ |
| Scenes | `MascotRoom.unity` e `MascotRoomTestHarness.unity` ✅ (vazias, precisam ser populadas) |
| AnimatorStub | `Assets/Mascote/Animations/MascotAnimatorStub.controller` ✅ |
| Prefabs mascote | ❌ NENHUM ainda — você cria após importar os GLBs |
| AccessoryDefinition .asset (18) | ❌ — gerar via menu `Mascote → Generate Accessory Definitions` |
| Android RN bridge (Kotlin) | ✅ `UnityMascotModule.kt` (stub), `UnityMascotPackage.kt`, `MainApplication.kt` já registra |
| `unityLibrary/` AAR | ❌ só placeholder — gerado pelo Build do Passo 8 |
| `settings.gradle` include unityLibrary | ❌ — deixe pra DEPOIS do Build (referência morta quebra gradle) |
| Manifest `UnityPlayerActivity` | ❌ — pelo mesmo motivo, deixe pra depois do Build |

> **Tradução prática:** quando você abrir o Unity Hub → Add project → pick `MascotUnityCore`, o editor faz a primeira import (5-15min em SSD), o Package Manager resolve URP, e você já tem a estrutura de pastas correta esperando.

---

## 0) Pré-flight (faça uma vez, fora do Editor)

```powershell
# Confirmar versão Unity (deve dizer 6000.4.8f1):
Get-Content C:\Users\Felipe\Documents\mascote\unity\MascotUnityCore\ProjectSettings\ProjectVersion.txt

# Confirmar junction de GLBs (deve listar bipo.glb, zip.glb, lulu.glb, aro.glb, accessories\):
Get-ChildItem C:\Users\Felipe\Documents\mascote\unity\MascotUnityCore\Assets\Mascote\StreamingAssets\mascot-3d
```

Se faltar a junction:

```powershell
& 'C:\Users\Felipe\Documents\mascote\unity\MascotUnityCore\scripts\sync-mascot-assets.ps1'
```

> Se reclamar "Destino existe e não é junction", apague a pasta `Assets\Mascote\StreamingAssets\mascot-3d` (é placeholder com README) e rode de novo.

---

## 1) Abrir o projeto no Unity Hub

1. **Unity Hub → Add (dropdown) → "Add project from disk"** (não é "Import projects" — esse é pra bulk-importar várias pastas).
2. Navegue até `C:\Users\Felipe\Documents\mascote\unity\MascotUnityCore` → Open.
3. Hub vai detectar `6000.4.8f1 Supported` no card do projeto.
4. Clique no card pra abrir.
5. **Primeira abertura demora 5–15 min** — Unity gera `Library/`, resolve packages (URP 17.0.4, Newtonsoft etc.), importa GLBs do StreamingAssets, gera todos os `.meta`.
6. Console **deve estar limpo** (warnings de URP migration são ok).

**Erros comuns nesta etapa:**

| Sintoma | Causa | Fix |
|---|---|---|
| Hub diz "Missing Editor version 6000.4.8f1" | Hub não conhece esse editor | Hub → Installs → Add → 6000.4.8f1 com módulos: Android Build Support + Android SDK & NDK Tools + OpenJDK + Documentation |
| Console: `URP Asset is not assigned` | URP veio mas não tem RenderPipelineAsset | Edit → Project Settings → Graphics → Default Render Pipeline → criar e atribuir um `UniversalRenderPipelineAsset` (right-click Assets → Create → Rendering → URP Asset) |
| Console: `Newtonsoft.Json type not found` | Package missing (não deveria — já está pinned) | Window → Package Manager → +`com.unity.nuget.newtonsoft-json` |
| Compile errors mass | Possível Editor folder asmdef sem ref | Verifique `Assets/Mascote/Editor/MascotUnityCore.Editor.asmdef` tem `"references": ["MascotUnityCore"]` |

---

## 2) Importar os 4 GLBs base como prefabs

Os GLBs estão em `Assets/Mascote/StreamingAssets/mascot-3d/` (via junction). Unity os trata como modelos importáveis automaticamente — vai gerar materiais e meshes na primeira import.

**Workflow:**

1. No Project view, navegue até `Assets/Mascote/StreamingAssets/mascot-3d/`.
2. Selecione `bipo.glb`.
3. Inspector → **Model** tab:
   - Scale Factor: `1`, Use File Scale: `On`
   - Mesh Compression: `Low`
   - Read/Write: `Off`
4. Inspector → **Rig** tab:
   - Animation Type: **Generic**
   - Avatar Definition: **Create From This Model**
   - Optimize Game Objects: **Off**
5. Inspector → **Materials** tab:
   - Material Creation Mode: **Standard (Built-in)** ou deixa default (URP Lit)
   - **Extract Materials...** → `Assets/Mascote/Materials/`
6. **Apply** no rodapé do Inspector.
7. Arraste o asset pra `Assets/Mascote/Prefabs/Mascots/` → cria prefab `bipo.prefab`.
8. Repita pra `zip`, `lulu`, `aro`.

> **Workaround se Unity não tratar os GLBs sob StreamingAssets como Models** (depende da versão; Unity 6 deve tratar): faça **copy** dos GLBs pra `Assets/Mascote/Models/` (não move — preserve a fonte canônica). Apply Model/Rig/Materials lá. Use os prefabs derivados.

---

## 3) Gerar as 18 AccessoryDefinitions (1 clique)

Em vez de criar manualmente 18 ScriptableObjects:

1. Menu superior: **Mascote → Generate Accessory Definitions**
2. Confirma o diálogo "Pronto! Criados: 18, Atualizados: 0".
3. Veja `Assets/Mascote/Data/Accessories/` — 18 `.asset` populados.

Para validar que os GLBs estão acessíveis:

4. Menu: **Mascote → Validate Accessory GLBs (StreamingAssets)**
5. Deve dizer "OK — todos 18 GLBs presentes".

> Source-of-truth do mapping é `AccessoryRegistry.cs:65-83`. Se você editar lá (adicionar acessório novo), edite também `Editor/AccessoryAssetGenerator.cs:25-44` e re-rode o menu.

---

## 4) Sockets nos prefabs (replicar pros 4 mascotes)

Para cada `*.prefab` em `Assets/Mascote/Prefabs/Mascots/`:

1. Double-click o prefab → modo isolation.
2. Selecione o **root** do mascote (GameObject de mais alto nível).
3. Hierarchy → Right-click → Create Empty → renomeie `Socket_Hat`.
4. Move tool: posicione no topo da cabeça.
5. Repita pra: `Socket_Glasses`, `Socket_Neck`, `Socket_Back`, `Socket_Ear_L`, `Socket_Ear_R`, `Socket_Aura`.
6. Selecione o root do prefab → adicione componente **MascotAccessoryController** (script ou drag de `Scripts/Core/`).
7. **Apply All** no prefab.

> Os 7 sockets seguem o mapping de `MascotEnums.AttachPoint`. Se um acessório tiver `defaultBone=hand_R` mas você não tiver socket nessa pose, ele cai em fallback.

---

## 5) Animator Controller — povoar o stub

`Assets/Mascote/Animations/MascotAnimatorStub.controller` já existe. Para torná-lo funcional:

1. Double-click → abre Animator window.
2. Adicione 12 states (nomes de `AnimationStateMap.cs`):
   - `Idle`, `Blink`, `Smile`, `Sad`, `Excited`, `Sleep`, `Wave`, `Hatch`, `Celebrate`, `Rest`, `Observe`, `Stretch`.
3. Parameters tab:
   - Adicione **Trigger** `OneShot`.
   - (Opcional) **Int** `OneShotHash` se quiser routing por `AnimationStateMap.ResolveClip(name)`.
4. Para cada state diferente de Idle: **Make Transition** do `Any State` → state, condição `OneShot`.
5. Clips: enquanto GLBs reais não têm animation clips, use **clips dummy de 1 frame**:
   - Window → Animation → seleciona prefab → Create Clip → grava 1 frame → salva como `idle_dummy.anim` etc.
6. **Apply Root Motion: OFF** em todos os clips.

---

## 6) Cena `MascotRoom.unity` produtiva

Abra `Assets/Mascote/Scenes/MascotRoom.unity`. Garanta os seguintes GameObjects:

| GameObject | Componentes | Notas |
|---|---|---|
| `MascotUnityBridge` | `ReactNativeBridge` | DontDestroyOnLoad. **Nome case-sensitive** — RN procura por este nome exato. |
| `Directional Light` | (built-in) | Rotation -45,-45,0; intensity 1.2 |
| `Main Camera` | (built-in) | Position 0,1.5,-3; orthographic OFF; FOV 45 |
| `MascotRoot` | `MascotController` + `MascotMorphologyController` + `MascotAccessoryController` + `MascotAnimationController` + `IdleBehaviorController` + `LookAtTouchController` | Filho `mascotInstance` recebe o prefab Bipo (ou outro) instanciado |
| `MascotDirector` | `MascotDirector` | Drag os controllers de `MascotRoot` para os slots públicos do Director |
| `MascotEnvironment` | `MascotEnvironmentController` | (Opcional) ambient/lighting/skybox swap |

**Save** (Ctrl+S). Click Play → o Console deve mostrar `[Unity → RN] ready (version=mascot-core-X.X)`.

---

## 7) Test Harness — interagir sem RN

1. Abra `Assets/Mascote/Scenes/MascotRoomTestHarness.unity`.
2. Garanta um GameObject com `MascotRoomTestHarness` apontando pro `MascotDirector` da cena.
3. Play → botões aparecem no Game view:
   - Apply Bipo / Zip / Lulu / Aro
   - Mood: sad / happy / excited / exhausted
   - Habit: water / sleep / exercise / meditation / reading
   - Level up / Phase advance / Mutation legendary
   - Reduce motion ON/OFF
   - Quality low / medium / high
4. Cada botão dispara um método em `MascotDirector` com JSON de exemplo (fixtures em `Tests/EditMode/Fixtures/sample-state.json`).

> Se botão não responder, abra Console — provavelmente alguma reference no Inspector está vazia. Padrão: `mascotController.mascotRoot` precisa apontar pro child do prefab instanciado.

---

## 8) Build Android Library

Pré-requisitos (deveriam estar OK após instalação do Hub):
- Android Build Support + Android SDK & NDK Tools + OpenJDK módulos instalados
- NDK 26.1.10909125 (Unity 6 default)

Passos:

1. **File → Build Settings**
2. Platform → **Android** → **Switch Platform** (recompila scripts pra target Android — ~3-5 min)
3. **Player Settings (botão no Build Settings)** → Other Settings:
   - Scripting Backend: **IL2CPP**
   - Target Architectures: **ARMv7 + ARM64** (marque ambos)
   - Minimum API Level: **Android 6.0 'Marshmallow' (API 23)** — bate com `app/mobile/android/build.gradle minSdkVersion`
   - Target API Level: **Highest installed**
4. **Player Settings → Publishing Settings → Build**:
   - **Export Project: ON** ← crítico, gera estrutura Gradle (Unity-as-a-Library)
   - **Symlink Sources: OFF**
5. Build Settings → **Build** → escolha pasta **`C:\Users\Felipe\Documents\mascote\app\mobile\android\unityLibrary_export\`** (use um nome temporário; mova só o `unityLibrary/` interno pra `app/mobile/android/unityLibrary/` depois)
6. Build: **10-30 min** primeira vez (IL2CPP é lento)
7. Saída esperada: `unityLibrary_export/unityLibrary/build.gradle`, `unityLibrary_export/unityLibrary/src/`, `unityLibrary_export/unityLibrary/libs/unity-classes.jar`.

---

## 9) Integrar unityLibrary no app RN

**SÓ DEPOIS DO PASSO 8 GERAR O EXPORT.**

```powershell
# Copia conteúdo do unityLibrary exportado pra dentro da pasta esperada pelo Gradle
Copy-Item -Recurse -Force `
  'C:\Users\Felipe\Documents\mascote\app\mobile\android\unityLibrary_export\unityLibrary\*' `
  'C:\Users\Felipe\Documents\mascote\app\mobile\android\unityLibrary\'
```

Em `app/mobile/android/settings.gradle`, **adicione** (já é safe agora porque o módulo existe):

```gradle
include ':unityLibrary'
project(':unityLibrary').projectDir = new File(rootProject.projectDir, 'unityLibrary')
```

Em `app/mobile/android/app/build.gradle`, em `dependencies {}`:

```gradle
implementation project(':unityLibrary')
```

Em `app/mobile/android/app/src/main/AndroidManifest.xml`, **dentro de `<application>`**:

```xml
<activity android:name="com.unity3d.player.UnityPlayerActivity"
          android:theme="@style/UnityThemeSelector"
          android:configChanges="mcc|mnc|locale|touchscreen|keyboard|keyboardHidden|navigation|orientation|screenLayout|uiMode|screenSize|smallestScreenSize|fontScale|layoutDirection|density"
          android:hardwareAccelerated="true" />
```

**Upgrade UnityMascotModule.kt** (`app/mobile/android/app/src/main/java/app/meumascote/dev/unity/UnityMascotModule.kt`):

```kotlin
// Substituir o stub de postMessage:
@ReactMethod
fun postMessage(json: String, promise: Promise) {
    try {
        com.unity3d.player.UnityPlayer.UnitySendMessage("MascotUnityBridge", "OnMessageFromReactNative", json)
        promise.resolve(true)
    } catch (e: Throwable) {
        promise.reject("UNITY_POST_FAILED", e.message, e)
    }
}

// Substituir isAvailable:
@ReactMethod
fun isAvailable(promise: Promise) {
    val ok = try { Class.forName("com.unity3d.player.UnityPlayer"); true } catch (_: Throwable) { false }
    promise.resolve(ok)
}

// Em getConstants: "embedded" to true
```

Build EAS:

```bash
cd app/mobile
eas build --platform android --profile preview-unity
```

---

## 10) Verificação fim-a-fim

`.env.local` no `app/mobile/`:

```env
EXPO_PUBLIC_MASCOT_RENDERER=unity
EXPO_PUBLIC_UNITY_ENABLED=true
EXPO_PUBLIC_UNITY_DEBUG_PANEL=true
```

1. Abre o app → home Three.js normal (renderer fallback funciona)
2. Tap em "Visitar o quarto →" (em `/mascot`)
3. `/mascot-room` abre → debug log mostra `← ready (version=mascot-core-X.X)`
4. Tap nos botões Test → log mostra `→ event.play habit:water` + reaction visível no Unity
5. Setar `EXPO_PUBLIC_UNITY_SIMULATE_FAILURE=true` → deve cair pra Three.js em < 2s

Done.

---

## Troubleshooting expandido

| Sintoma | Causa provável | Fix |
|---|---|---|
| `Newtonsoft.Json type not found` | Package missing | Package Manager → Install `com.unity.nuget.newtonsoft-json@3.2.1` (já está pinned no manifest, refresh resolve) |
| Mascot não aparece em Play | `mascotController.mascotRoot` not assigned | Inspector → drag o GameObject filho da cena no slot |
| Animator parado | `OneShot` trigger não disparado | `MascotAnimationController.PlayOneShot` chama `animator.SetTrigger("OneShot")` — verifique no Animator |
| RN não recebe `ready` | Bridge GameObject mal nomeado | DEVE ser `MascotUnityBridge` (case-sensitive) |
| Build Android falha em IL2CPP | NDK não instalado | Hub → Installs → Add Modules → Android Build Support → NDK 26.1.10909125 |
| Crash no boot Android | UnityPlayer activity não declarada | `AndroidManifest.xml` precisa de `UnityPlayerActivity` (Passo 9) |
| APK enorme (+200MB) | Includes desnecessários | Player Settings → Stripping Level: High; revisar `Packages/manifest.json` |
| Hub diz "Editor version not found" mesmo após instalar | Hub não escaneou disco | Hub → Installs → Locate → aponta pra `D:\Program Files\Unity\Hub\Editor\6000.4.8f1\Editor\Unity.exe` |
| Compile errors em `AccessoryAssetGenerator` | Editor asmdef sem ref a MascotUnityCore | Confirme `Assets/Mascote/Editor/MascotUnityCore.Editor.asmdef` tem `"references": ["MascotUnityCore"]` |
| URP packages não resolveram | Manifest editado com versão errada | Edite `Packages/manifest.json` → pin `com.unity.render-pipelines.universal` em versão Unity 6 compatível (17.x). Delete `Packages/packages-lock.json` e re-abra. |
| Junction PowerShell falha "Acesso negado" | Falta admin (mklink /J pode pedir) | Abra PowerShell como Admin OU use `New-Item -ItemType Junction` (não requer admin no Windows 10+) |

---

## O que mudou em relação ao runbook v1

- ✅ Versão Unity corrigida pra 6000.4.8f1 (era 2022.3.62f1 no projeto, agora pinned no commit `b9ba8e1`)
- ✅ URP adicionado ao manifest (era assumido mas faltava)
- ✅ Folders Models/Data/Prefabs/Mascots/Editor agora existem
- ✅ Geração das 18 AccessoryDefinitions automatizada via menu (era 18× criação manual)
- ✅ Documentado que RN-Android Kotlin já está em place
- ✅ Documentado que `unityLibrary/` placeholder não pode ser referenciado em settings.gradle ANTES do build (era erro silencioso)
- ✅ Troubleshooting expandido com 4 sintomas novos
- ✅ Passo 9 reescrito com diff explícito de UnityMascotModule.kt (stub → real)
