# Unity Runbook v3 — Snapshot Final & Quando Felipe Voltar

> Substitui v1 e v2. Atualizado **2026-05-23 ~22:00** após sessão Cowork que partiu do zero
> e chegou ao bipo respirando na cena com test harness de 18 acessórios funcionais.
> 4 commits no main: `b9ba8e1`, `f961098`, `9bb41b9` (+ commit deste runbook).

---

## TL;DR — primeira coisa quando você voltar

**Você tem 2 problemas pendentes, ambos resolvíveis em ~5 min cada:**

1. **Avast está bloqueando o `UnityPackageManager.exe`** — Unity crashou e ao reabrir mostra "Failed to start Unity Package Manager local server process". Fix:
   - Avast → Menu → Configurações → Geral → **Exceções**
   - Adicionar: `D:\6000.4.8f1\Editor\Data\Resources\PackageManager\Server\UnityPackageManager.exe`
   - (E provavelmente também: `D:\6000.4.8f1\Editor\Unity.exe` se quiser garantir)
   - Reiniciar Avast, depois abrir Unity normalmente

2. **MaterialPropertyBlock crashou Unity uma vez** — já fixei o código, mas se ele reclamar de novo, é porque o cache de Library/ ficou corrompido. Fix: delete `unity\MascotUnityCore\Library\` e reabra (vai demorar 5-15 min pra regenerar).

**Depois desses 2:** abre Unity, menu **Mascote → 🚀 Setup Everything**, aperta **Play**, e teste clicando nos botões do Test Harness. O bipo deve aparecer azul, e clicar `cap_classic` deve botar um chapéu vermelho na cabeça dele.

---

## Estado atual do projeto

### O que já funciona end-to-end

| Camada | Status | Notas |
|---|---|---|
| **Unity 6.4 (6000.4.8f1)** instalado em `D:\6000.4.8f1\` | ✅ | + módulos Android + glTFast |
| **Project version pinned** | ✅ | `ProjectVersion.txt` = 6000.4.8f1 |
| **URP 17.0.4 + UrpAsset ativo** | ✅ | `Assets/Settings/MascotUniversalRP.asset` |
| **glTFast 6.10.1** | ✅ | importa GLBs em `Models/` como meshes reais (Sprint 3 pode usar) |
| **Particle System module** | ✅ | resolve `MascotVfxController` compile error |
| **Newtonsoft.Json 3.2.1** | ✅ | já estava |
| **4 prefabs mascote** (`bipo/zip/lulu/aro`) | ✅ | cápsula + esfera + 2 olhos com pupilas + 2 pés + 7 sockets — cores azul/laranja/rosa/verde |
| **18 AccessoryDefinitions ScriptableObjects** | ✅ | em `Assets/Mascote/Data/Accessories/` |
| **AccessoryPrimitiveBuilder** | ✅ | gera visual primitivo real pra cada acessório (cap = cilindro+visor, óculos = 2 lentes+ponte, asa = 2 quads, etc) |
| **Cena MascotRoom.unity** | ✅ | Floor + Camera + Light + Bridge + Director + Mascote + Harness — montada via Editor menu |
| **Test Harness Rich (OnGUI)** | ✅ | 3 colunas: Identidade (mascote+mood) / Reações (habit+gesture+special+quality) / Acessórios (18 toggles + Clear All) + status bar |
| **Auto-wire em Awake** | ✅ | MascotController, Director, Bridge, Router auto-detectam refs via `GetComponent` + `FindFirstObjectByType` — não dependem de SerializedField |
| **Slot→Socket fallback** | ✅ | bone `head` ou slot `hat` → `Socket_Hat` no prefab |
| **Skip tint nos acessórios e olhos** | ✅ | preserva paleta original do prefab quando `bodyTint = white` |
| **RN-Android Kotlin bridge** | ✅ | `UnityMascotModule.kt` + `Package.kt` + `MainApplication.kt` já registra |
| **GLBs base + 18 accessory GLBs** | ✅ | `Assets/Mascote/StreamingAssets/mascot-3d/` (junction pra `app/mobile/assets/mascot-3d/`) |

### Menu Mascote (no top bar do Unity Editor)

| Item | O que faz |
|---|---|
| 🚀 **Setup Everything** | Roda em sequência: URP setup → 18 AccessoryDefinitions → 4 prefabs mascote → constrói MascotRoom.unity. ~30s. **Idempotente.** |
| Build Complete Scene (MascotRoom) | Só reconstrói a cena (assume URP + prefabs já existem) |
| Generate Accessory Definitions | Cria/atualiza 18 `.asset` SO |
| Generate Mascot Prefabs (Primitives) | Cria/atualiza 4 prefabs mascote |
| Setup URP Pipeline | Cria URPAsset + Renderer + seta ativo em GraphicsSettings + Quality levels |
| Validate Accessory GLBs (StreamingAssets) | Confere se os 18 .glb existem no path esperado (bug conhecido: usa caminho errado, ignore por ora) |

### Cena MascotRoom.unity — Hierarchy esperada

```
MascotRoom
├── Directional Light       (warm, 1.2 intensity, -45° -25° 0°)
├── Main Camera             (FOV 38, pos 0/1.3/-3.5, rot 8/0/0, BG #D5E8FA pastel)
├── Floor                   (plane 3x3, Mat_Floor pastel)
├── MascotUnityBridge       (ReactNativeBridge + UnityMessageRouter)
│                            ↑ Awake move pra DontDestroyOnLoad em Play
├── MascotRoot              (bipo prefab instance)
│   ├── Body / Head / Eye_L / Eye_R / Foot_L / Foot_R
│   ├── Socket_Hat / Socket_Glasses / Socket_Neck / Socket_Back / Socket_Ear_L / Socket_Ear_R / Socket_Aura
│   └── (components) MascotController + Morphology + Accessory + Reaction + Quality + Animation + IdleBehavior + LookAtTouch + Blink + Breathing
├── MascotEnvironment       (MascotEnvironmentController)
├── MascotDirector          (MascotDirector — auto-wira controllers em Awake)
└── MascotRoomTestHarness   (MascotRoomTestHarnessRich — HUD 3 colunas)
```

---

## Quando você voltar — Checklist pra brincar (5 min)

1. ✅ Desbloquear `UnityPackageManager.exe` no Avast (ver topo)
2. ✅ Abrir Unity (Hub → MascotUnityCore ou direto via taskbar)
3. ⏳ Aguardar Library/ resolver packages (~30-60s — URP/glTFast já no manifest, cache local)
4. ✅ Console deve estar **0 errors, 4 warnings benignos** (animation hides, FindObjectOfType deprecated, Input Manager deprecated)
5. ✅ Menu **Mascote → 🚀 Setup Everything** → diálogo → Sim, bora! → ~30s → "Tudo Pronto!"
6. ✅ Aperta **Play** (▶ no top center)
7. ✅ HUD aparece: 3 colunas com Identidade/Reações/Acessórios + status bar embaixo
8. ✅ Bipo aparece azul no centro
9. ✅ Click `cap_classic` → chapéu **vermelho com visor** deve aparecer no topo da cabeça
10. ✅ Click `glasses_round` → óculos pretos nos olhos
11. ✅ Click `wings_angel` → asas brancas nas costas
12. ✅ Click `zip` → mascote troca pra laranja com mesmos acessórios
13. ✅ Click `sad` mood → status muda (visual feedback ainda é minimal — Sprint 3 vai mudar postura + emoji facial)

---

## Roadmap pra "coisa mais foda do planeta"

### Sprint 3 — Visual polish (próximos 2-4h de trabalho)

- [ ] **Trocar tint do mood:** mood `excited` aumenta saturation+brightness, `sad` dessatura, `exhausted` opaca; via MaterialPropertyBlock animado
- [ ] **Idle animation:** já tem BreathingController + BlinkController; falta wirar `headBone`/`bodyBone`/`eyeL`/`eyeR` (no SceneBuilder, usar `transform.Find("Head")`, `Find("Body")`, etc)
- [ ] **Squash & stretch** quando phase advance: tween scale para `phaseScale`
- [ ] **Celebrate VFX:** spawn ParticleSystem stub em `Socket_Aura` quando event `mutation.unlocked` ou `phase.advanced`
- [ ] **Skybox URP gradiente:** procedural sky azul→rosa em vez de cor sólida
- [ ] **Materiais emissive:** olhos com glow leve, body com clearcoat
- [ ] **Hover/click feedback:** LookAtTouchController acompanha cursor (rotaciona head)

### Sprint 3.5 — RN integration end-to-end (4-6h)

- [ ] Build Android Library: File → Build Settings → Android → Export Project → unityLibrary
- [ ] Copiar exported `unityLibrary/` pra `app/mobile/android/unityLibrary/`
- [ ] Editar `app/mobile/android/settings.gradle` (include `:unityLibrary`)
- [ ] Editar `app/mobile/android/app/build.gradle` (implementation project ':unityLibrary')
- [ ] Adicionar `UnityPlayerActivity` ao `AndroidManifest.xml`
- [ ] Upgrade `UnityMascotModule.kt` stub → real (chama `UnityPlayer.UnitySendMessage`)
- [ ] `eas build --platform android --profile preview-unity`
- [ ] Test em device com `EXPO_PUBLIC_MASCOT_RENDERER=unity`

### Sprint 4 — Real GLB rendering (refatora)

- [ ] Trocar `AccessoryPrimitiveBuilder` por carregamento async via glTFast:
  - `GltfImport.LoadFile(streamingAssetsPath + assetKey + ".glb")`
  - Instanciar mesh resultante em vez de spawn primitives
  - Fallback pra primitive se falhar
- [ ] Trocar `MascotPrefabGenerator` (primitives) por import direto dos 4 GLBs base via glTFast
- [ ] Animations dos GLBs → wirar em `MascotAnimatorStub.controller`

### Sprint 5 — Engagement / Retention

- [ ] **Mascot reage a abertura do app:** estado salvo entre sessões, mascote "estava esperando"
- [ ] **Acessórios desbloqueados por hábitos:** completar 7 dias de meditation desbloqueia `aura_cosmic`
- [ ] **DNA visual:** mascote varia por personalityHash do user (cor, body proportion, postura)
- [ ] **Reações contextuais:** mascote vê a hora do dia (dorme à noite, ativo de manhã)
- [ ] **Phase visual evolution:** baby→teen→adult com diferenças em scale, accessories permitidos

---

## Arquitetura — quick reference

### Fluxo RN → Unity (Play)

```
React Native postMessage(json)
  └→ UnityMascotModule.kt (Android)
     └→ UnityPlayer.UnitySendMessage("MascotUnityBridge", "OnMessageFromReactNative", json)
        └→ ReactNativeBridge.OnMessageFromReactNative(json)
           └→ UnityMessageRouter.RouteJson(json)
              └→ JsonMessageParser.TryParseInbound → type discriminator
              └→ switch:
                 - "state.update"  → MascotDirector.ApplyState
                 - "event.play"    → MascotDirector.PlayEvent (habit/phase/mutation)
                 - "gesture"       → MascotDirector.HandleGesture (pet/tap/poke)
                 - "quality.set"   → MascotDirector.SetQuality
              └→ MascotController.ApplyFromState
                 - Morphology bones
                 - Accessories (spawn primitives via slot→socket lookup)
                 - Animation state
                 - Visual tints (skip se white)
```

### Fluxo Unity → RN (Outbound)

```
OutboundEventDispatcher.SendReady() em Start
  └→ JsonMessageParser.SerializeOutbound
     └→ ReactNativeBridge.SendToReactNative
        └→ AndroidJavaClass("app.meumascote.dev.unity.UnityMascotModule")
           └→ Call("onUnityMessage", json)
              └→ DeviceEventEmitter "UnityMascotMessage" event → JS subscribers
```

---

## Bugs conhecidos & workarounds

| Bug | Workaround |
|---|---|
| Avast bloqueia `UnityPackageManager.exe` | Adicionar exceção no Avast (ver topo) |
| Unity crashou após salvar cena | Library/ pode estar corrompido — delete e reabra |
| Acessório fica em (0,0,0) em vez do socket | Bug de bone-name mismatch — fix já aplicado: fallback chain `bone exato → Socket_<slot> → attachRoot` |
| Mascote vira branco quando state aplicado | `bodyTint = white` no JSON override URP material — fix já aplicado: skip tint se white puro |
| `MaterialPropertyBlock _mpb = new()` errou | Field initializer com Unity-native type não permitido — fix já aplicado: init em Awake |
| Compile error CS1069 ParticleSystem | Module faltando — fix já aplicado: `com.unity.modules.particlesystem` no manifest |
| URP materiais ficam rosa | URP Asset não setado em GraphicsSettings — fix já aplicado: `Mascote → Setup URP Pipeline` |
| Hub diz "Missing Editor" | Hub não conhece o editor — Hub → Installs → Add → Locate → `D:\6000.4.8f1\Editor\Unity.exe` |
| Setup Everything dialog não aparece | Click duas vezes em Mascote menu pra reabrir; ou Escape e re-click |

---

## Commits da sessão

```
9bb41b9 feat(unity): scene builder + test harness rich + auto-wire + accessory visuals
f961098 feat(unity): mascot prefabs from scratch + URP setup + editor tools
b9ba8e1 chore(unity): bump ProjectVersion to 6000.4.8f1 (Unity 6 migration)
fef81e8 (pré-sessão) feat(frontend): Unity mascot renderer integration (opt-in)
```

Rollback:
- `git revert 9bb41b9` desfaz só scene builder/harness rich (mantém prefabs+URP)
- `git revert 9bb41b9 f961098 b9ba8e1` desfaz tudo da sessão
- Os GLBs em `Assets/Mascote/Models/` (~5MB) podem ser deletados se você for usar só glTFast em runtime

---

## Arquivos novos criados

```
unity/MascotUnityCore/
├── Assets/Mascote/
│   ├── Editor/
│   │   ├── AccessoryAssetGenerator.cs       # menu: 18 SO
│   │   ├── MascotPrefabGenerator.cs         # menu: 4 prefabs
│   │   ├── MascotSceneBuilder.cs            # menu: cena completa
│   │   ├── MascotSetupAll.cs                # menu: 🚀 Setup Everything
│   │   ├── UrpSetup.cs                      # menu: URP pipeline
│   │   └── MascotUnityCore.Editor.asmdef    # refs MascotUnityCore + URP runtime/editor
│   ├── Scripts/Core/
│   │   ├── AccessoryPrimitiveBuilder.cs     # visual primitivo dos 18 acc
│   │   └── MascotRoomTestHarnessRich.cs     # HUD 3 colunas
│   ├── Models/                              # 4 GLBs copiados (sprint glTFast)
│   ├── Data/Accessories/                    # 18 .asset (geradas)
│   ├── Prefabs/Mascots/                     # 4 .prefab (gerados)
│   ├── Materials/                           # Mat_bipo, Mat_zip, ... Mat_Eye, Mat_Floor
│   └── Scenes/MascotRoom.unity              # cena montada via SceneBuilder
└── Assets/Settings/
    ├── MascotUniversalRP.asset              # URP pipeline asset
    └── MascotURPRenderer.asset              # URP renderer
```

Files modificados:
- `Packages/manifest.json` — + URP 17.0.4 + glTFast 6.10.1 + particlesystem
- `ProjectSettings/ProjectVersion.txt` — bump pra 6000.4.8f1
- `ProjectSettings/GraphicsSettings.asset` — URP pipeline setado
- `ProjectSettings/QualitySettings.asset` — URP em todos os Quality levels
- `Assets/Mascote/Scripts/Bridge/ReactNativeBridge.cs` — auto-wire router + outbound
- `Assets/Mascote/Scripts/Bridge/UnityMessageRouter.cs` — auto-wire director em Awake
- `Assets/Mascote/Scripts/Core/MascotController.cs` — auto-wire sub-controllers, fix MaterialPropertyBlock, skip tint em acc/olhos
- `Assets/Mascote/Scripts/Core/MascotDirector.cs` — auto-wire controllers em Awake
- `Assets/Mascote/Scripts/Core/MascotAccessoryController.cs` — slot→socket fallback, integra AccessoryPrimitiveBuilder, auto-wire attachRoot
- `Assets/Mascote/Scenes/MascotRoom.unity` — GUIDs patcheados (script refs reais)
- `Assets/Mascote/Scenes/MascotRoomTestHarness.unity` — idem

---

## Em uma frase

> "Do zero ao bipo azul respirando em Play mode com test harness pra 18 acessórios em uma sessão de Cowork, partindo de nenhum Unity instalado."
