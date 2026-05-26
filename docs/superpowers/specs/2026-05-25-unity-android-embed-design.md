# Spec — Unity Embed Real (Android) — Slice 1

**Data:** 2026-05-25
**Autor:** Felipe + Claude (auditoria + brainstorming)
**Status:** Approved for implementation
**Slice:** 1 de N do roadmap "Mascote 100% procedural com Unity"

## Contexto

Auditoria completa do projeto (2026-05-25) revelou que a integração Unity está em estado mais avançado do que o esperado:

- ✅ Bridge TS (`UnityMascotBridge.ts`, 348 linhas) com ACK retry, throttle 10Hz, schema versionado
- ✅ Módulo Kotlin (`UnityMascotModule.kt`) com reflection-safe send to Unity
- ✅ `UnityMascotPackage` registrado em `MainApplication.kt`
- ✅ Feature flags wired: `EXPO_PUBLIC_UNITY_ENABLED`, `EXPO_PUBLIC_MASCOT_RENDERER`, `EXPO_PUBLIC_UNITY_SIMULATE_FAILURE`
- ✅ `MascotRenderer.tsx` com fallback automático Unity → Three.js
- ✅ Projeto Unity 6.0 + URP 17.0.4 com `MascotDirector` + 8 controllers + `ReactNativeBridge.cs`
- ✅ 4 GLBs sincronizados via junction em `StreamingAssets`
- ✅ Config plugin `withUnityAndroid.js` + script `wire-unity-android.ps1`
- ✅ Testes do contrato em ambos os lados

O que falta:

1. **`unityLibrary` AAR nunca foi gerada** — export do projeto Unity é 100% manual via Editor UI; sem isso o app cai em modo stub.
2. **Lifecycle do `UnityPlayer` não é delegado pelo `MainActivity`** — se o AAR for compilado e ativado hoje, Unity vai vazar memória ao backgroundar, não vai pausar em lock screen, e pode causar ANR.
3. **Cena `MascotRoom.unity` tem GUIDs vazios** — embora os 4 prefabs (`bipo.prefab`, `zip.prefab`, `lulu.prefab`, `aro.prefab`) já existam em `Assets/Mascote/Prefabs/Mascots/`, a cena ainda não os referencia. Validação visual e wiring de scene ficam como passo manual.
4. **Zero testes para o módulo Kotlin e zero testes de lifecycle do hook React** — área crítica sem coverage.

Este slice fecha (1), (2), (4) e parte de (3). A finalização visual (3) requer trabalho manual no Unity Editor que será documentado como checklist.

## Definition of Done

- [ ] Editor script `Mascote → Build Android Library` exporta direto pra `app/mobile/android/unityLibrary/` em ≤2 minutos
- [ ] Script PowerShell `wire-unity-android.ps1` (já existente) patcheia settings.gradle + app/build.gradle + AndroidManifest após o export
- [ ] `MainActivity.kt` delega lifecycle (resume/pause/destroy/lowMemory/windowFocusChanged) ao `UnityPlayer` via reflection — funciona com AAR presente OU ausente
- [ ] Build Android passa com AAR ausente (modo stub, comportamento atual)
- [ ] Build Android passa com AAR presente (modo embedded — Unity renderiza)
- [ ] `EXPO_PUBLIC_UNITY_ENABLED=true npm run android` mostra mascote Unity quando AAR presente
- [ ] Background→foreground não vaza memória nem trava (verificado em emulator + 1 device físico)
- [ ] Default (flag off) renderiza exatamente como hoje (`Mascot3DAsset` GLB no R3F)
- [ ] Se Unity falhar em runtime, fallback automático funciona sem refresh
- [ ] Testes Kotlin (`UnityMascotModuleTest`) + TS (`useUnityMascot.lifecycle.test.tsx`) passando
- [ ] `docs/UNITY_ANDROID_INTEGRATION.md` atualizado com novo build pipeline e instruções de prefab prep
- [ ] `docs/UNITY_STATUS.md` atualizado refletindo estado pós-implementação
- [ ] Checklist manual de Felipe documentado claramente

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│ React Native (Expo) — TS                                    │
│                                                              │
│  MascotRenderer.tsx (já existe)                              │
│    └─ resolveRendererMode({ preferUnity })                   │
│        └─ mode === 'unity' && !unityFailed                   │
│            └─ <UnityMascotView state={...} />                │
│                                                              │
│  UnityMascotView.tsx (já existe)                             │
│    └─ useUnityMascot({ state, onFallback, ... })             │
│                                                              │
│  UnityMascotBridge.ts (já existe — ACK, throttle, retry)    │
└──────────────────────────┬──────────────────────────────────┘
                           │ NativeEventEmitter
┌──────────────────────────▼──────────────────────────────────┐
│ Android Native — Kotlin                                      │
│                                                              │
│  UnityMascotModule.kt (já existe — postMessage + isAvailable)│
│    └─ Reflection: Class.forName("com.unity3d.player...")    │
│                                                              │
│  MainActivity.kt (vai PATCH cirúrgico)                       │
│    └─ Delegates lifecycle to UnityPlayerActivityHelper       │
│                                                              │
│  UnityPlayerActivityHelper.kt (NOVO)                         │
│    └─ Reflection-safe lifecycle calls                        │
│        - onResume → UnityPlayer.resume()                     │
│        - onPause → UnityPlayer.pause()                       │
│        - onDestroy → UnityPlayer.quit()                      │
│        - onLowMemory → UnityPlayer.lowMemory()               │
│        - onWindowFocusChanged → UnityPlayer.windowFocusChanged│
└──────────────────────────┬──────────────────────────────────┘
                           │ JNI (UnitySendMessage)
┌──────────────────────────▼──────────────────────────────────┐
│ Unity 6.0 + URP 17.0.4 — C#                                  │
│                                                              │
│  ReactNativeBridge.cs (já existe)                            │
│    └─ OnMessageFromReactNative(json)                         │
│        └─ UnityMessageRouter → MascotDirector → controllers  │
│                                                              │
│  AndroidBuildPipeline.cs (NOVO — Editor script)              │
│    └─ Mascote → Build Android Library                        │
│        └─ BuildPipeline.BuildPlayer + ExportAsAndroidProject │
│        └─ Output: unity/build/android/unityLibrary/          │
└─────────────────────────────────────────────────────────────┘
```

## Componentes novos

### 1. `unity/MascotUnityCore/Assets/Mascote/Editor/AndroidBuildPipeline.cs`

Editor script que adiciona menu **`Mascote → Build Android Library`**.

**Responsabilidades:**
- Validar Unity está em Android build target (auto-switch se não estiver)
- Validar URP asset configurado pra mobile (low MSAA, no realtime shadows)
- Validar cena `MascotRoom.unity` está no Build Settings
- Configurar Player Settings pra export (IL2CPP, ARM64, scripting backend, min SDK 24 = matches RN)
- Definir output path `<repo>/app/mobile/android/unityLibrary/` (export direto pro local que `wire-unity-android.ps1` espera)
- Chamar `BuildPipeline.BuildPlayer` com `BuildOptions.AcceptExternalModificationsToPlayer` (modo "Export Project")
- Imprimir relatório com tamanho do AAR e tempo de build
- Sugerir próximo passo: rodar `wire-unity-android.ps1`

**Dependências:**
- `UnityEditor.BuildPipeline`
- `UnityEditor.PlayerSettings`
- `UnityEditor.EditorUserBuildSettings`

### 2. `app/mobile/android/app/src/main/java/app/meumascote/dev/unity/UnityPlayerActivityHelper.kt`

Helper estático que faz lifecycle calls ao `UnityPlayer` via reflection. Idempotente e safe quando classe ausente.

**API:**
```kotlin
object UnityPlayerActivityHelper {
    fun onResume(activity: Activity)
    fun onPause(activity: Activity)
    fun onDestroy(activity: Activity)
    fun onLowMemory()
    fun onWindowFocusChanged(hasFocus: Boolean)
    fun onConfigurationChanged(newConfig: Configuration)
    fun onTrimMemory(level: Int)

    /** Single source of truth — espelha UnityMascotModule.isUnityEmbedded() */
    fun isUnityEmbedded(): Boolean
}
```

**Comportamento:**
- Se `Class.forName("com.unity3d.player.UnityPlayer")` falha → NO-OP silent
- Se sucede → invoca método via reflection com `try/catch` defensivo
- Logs em DEBUG mode

### 3. Patch em `app/mobile/android/app/src/main/java/app/meumascote/dev/MainActivity.kt`

Adicionar overrides de lifecycle que delegam ao helper. Patch mínimo, sem mudar a delegate React.

**Métodos adicionados:**
- `onResume()`
- `onPause()`
- `onDestroy()`
- `onLowMemory()`
- `onWindowFocusChanged(hasFocus: Boolean)`
- `onTrimMemory(level: Int)`
- `onConfigurationChanged(newConfig: Configuration)`

Cada um chama `super.X()` primeiro, depois `UnityPlayerActivityHelper.X(this)`.

### 4. Testes

#### `app/mobile/android/app/src/test/java/app/meumascote/dev/unity/UnityMascotModuleTest.kt`

Unit test (Robolectric ou pure JUnit) cobrindo:
- `isAvailable()` retorna `false` quando `UnityPlayer` class não existe (cenário CI)
- `getConstants()` retorna `embedded=false, version='android-stub-0.3.0'`
- `postMessage(json)` em modo stub: resolve promise sem throw, loga em DEBUG
- Race condition: `onUnityMessage` chamado antes de `init` não crasha

#### `app/mobile/src/components/unity/__tests__/useUnityMascot.lifecycle.test.tsx`

Test cobrindo lifecycle do hook:
- Hook chamado sem `state` não envia nada
- State change throttled a 100ms
- Cleanup ao unmount cancela ACKs pendentes (não vaza listener)
- `simulateFailure=true` chama `onFallback`
- ACK timeout (250ms × 2 retries) chama `onFallback`
- `ready` event seta `version` corretamente

## Componentes EXISTENTES (não tocar — apenas usar)

- `UnityMascotBridge.ts` — já tem ACK, throttle, schema validation
- `UnityMascotView.tsx` — já renderiza View nativa quando disponível, placeholder caso contrário
- `useUnityMascot.ts` — já gerencia lifecycle do bridge a nível React
- `UnityMascotModule.kt` — já tem `postMessage`, `isAvailable`, `onUnityMessage` static callback
- `UnityMascotPackage.kt` — já registrado em `MainApplication.kt`
- `MascotRenderer.tsx` — já tem `unityFailed` state + `onFallback` callback wired
- `resolveRendererMode` em `core/mascot-render-contract` — já lê `EXPO_PUBLIC_UNITY_ENABLED` e `EXPO_PUBLIC_MASCOT_RENDERER`
- `wire-unity-android.ps1` — já sincroniza unityLibrary pra app/mobile/android/
- `withUnityAndroid.js` — config plugin já registrado em app.json
- `ReactNativeBridge.cs` — Unity-side bridge já completo
- `UnityMessageRouter.cs` + `JsonMessageParser.cs` — routing + parsing já completos
- `MascotDirector.cs` + 8 controllers — toda a runtime já implementada

## Out of scope (explicitamente)

- ❌ iOS — slice futuro (UnityFramework + Swift bridge)
- ❌ GLTFast runtime loading — slice futuro (asset pipeline avançado)
- ❌ CI/CD para AAR — slice futuro (Linux Unity runner ou cloud build)
- ❌ Morph targets / blend shapes — slice futuro (procedural geometry)
- ❌ Ateliê UI — slice paralelo
- ❌ Tela `mascot-room` nova — esse slice usa a tela existente que já consome UnityMascotView
- ❌ Otimização de tamanho do APK (Unity adiciona ~80–150 MB)
- ❌ Validar prefabs visualmente (precisa Unity Editor + designer human)

## Passos manuais (Felipe)

Este slice **NÃO pode ser 100% automatizado** porque Unity Editor exige interação humana pra:

1. **Verificar prefabs (já existem):**
   - Abrir `unity/MascotUnityCore/` no Unity Editor 6.0
   - Verificar que `Assets/Mascote/Prefabs/Mascots/{bipo,zip,lulu,aro}.prefab` carregam sem erro
   - Se algum estiver quebrado: re-importar GLB de `Assets/StreamingAssets/mascot-3d/` e recriar prefab
   - Validar bones nomeados conforme `MascotMorphologyController` espera (head, body, eye_L/R, arm_L/R, leg_L/R)

2. **Configurar cena `MascotRoom.unity`:**
   - Verificar/adicionar Camera + Directional Light + Point Light
   - Adicionar (se não tiver) GameObject vazio `MascotUnityBridge` + attach `ReactNativeBridge` component (nome importa — bridge usa `GameObject.Find("MascotUnityBridge")`)
   - Adicionar GameObject vazio `MascotInstance` + attach `MascotDirector` component + assign um dos 4 prefabs (qualquer um — runtime substitui)
   - Salvar
   - File → Build Settings → Adicionar cena à lista (Index 0)

3. **Rodar o novo Editor script:**
   - Menu `Mascote → Build Android Library`
   - Esperar export (~1-2 min na primeira vez)
   - Verificar output em `app/mobile/android/unityLibrary/build.gradle` (existe = sucesso)

4. **Wirar no projeto Android:**
   - `cd app/mobile`
   - `powershell -ExecutionPolicy Bypass -File scripts/wire-unity-android.ps1`

5. **Buildar e testar:**
   - `cd app/mobile`
   - Criar `.env.local`: `EXPO_PUBLIC_UNITY_ENABLED=true` + `EXPO_PUBLIC_UNITY_DEBUG_PANEL=true`
   - `npx expo run:android`
   - Abrir tela `/mascot-room` e verificar `nativeEmbedded: true` no debug panel

## Riscos e mitigação

| Risco | Severidade | Mitigação |
|---|---|---|
| Build do unityLibrary quebra build Android atual | Alta | Patch usa reflection — se classe ausente, lifecycle helper é NO-OP. Build normal segue funcionando com flag off. |
| Unity crash em runtime → app crash | Média | `UnityMascotBridge` já emite `UNITY_ERROR`; `MascotRenderer.unityFailed` aciona fallback automático |
| APK fica gigante (+80-150MB) | Média | Documentar; sugerir App Bundle (AAB) split por ABI em próximo slice |
| Lifecycle bug deixa Unity rodando em background → dreno bateria | Alta | Helper delega TODOS os lifecycle callbacks ao UnityPlayer; testar matrix completo |
| Prefab import quebra rig naming | Média | `MascotMorphologyController` já loga warning quando bone não encontrado; vou adicionar validador no Editor script que verifica naming antes do build |
| Reflection silenciosa esconde erros reais | Baixa | Logs em DEBUG mode pra todos os calls; em release fica silent pra não crashar prod |
| Unity 6 incompatível com algum plugin Android third-party | Baixa | Auditoria não achou plugins third-party impactantes; reportar se aparecer |

## Plano de rollback

Se algo der errado em produção:

1. **Imediato:** definir `EXPO_PUBLIC_UNITY_ENABLED=false` no build de release e re-publicar. Comportamento volta pro `Mascot3DAsset` GLB no R3F (status atual hoje).
2. **Code-level:** reverter os 3 commits desse slice; comportamento volta totalmente.
3. **Persistir só o spec:** mesmo se reverter código, o spec fica como documentação histórica.

## Testes de aceitação (manual)

Após implementação + passos manuais de Felipe:

1. **Smoke test sem Unity:** `EXPO_PUBLIC_UNITY_ENABLED=false npm run android` → app abre, home renderiza `Mascot3DAsset` (GLB no R3F), nada diferente do baseline.
2. **Smoke test com Unity:** `EXPO_PUBLIC_UNITY_ENABLED=true npm run android` → home renderiza Three.js, `/mascot-room` renderiza Unity. UnityDebugPanel mostra version `android-embedded-0.3.0` e `embedded=true`.
3. **Gestos:** tap no mascote → `MascotReactionController` toca animação smile/wave; evento `MASCOT_TAPPED` chega no RN.
4. **Lifecycle:** abrir Unity, mandar app pra background, voltar → mascote continua renderizando; logs Logcat mostram `UnityPlayer.pause` + `UnityPlayer.resume`.
5. **Memory:** repetir #4 10 vezes; observar memory Android Studio Profiler — não deve crescer linearmente.
6. **Fallback:** `EXPO_PUBLIC_UNITY_SIMULATE_FAILURE=true npm run android` → UnityMascotView mostra "Unity indisponível" + `MascotRenderer` automaticamente cai pro Three.js.
7. **Phase advance:** trigger evolução via debug → `EVOLUTION_ANIMATION_FINISHED` evento chega no RN.

## Cronograma estimado

| Workstream | Tempo | Dep |
|---|---|---|
| Spec + commit | 30min | - |
| Editor script `AndroidBuildPipeline.cs` | 1h | - |
| `UnityPlayerActivityHelper.kt` | 1h | - |
| Patch `MainActivity.kt` | 30min | helper |
| Testes Kotlin module | 1.5h | helper |
| Testes TS lifecycle hook | 1.5h | - |
| Update `UNITY_ANDROID_INTEGRATION.md` | 30min | tudo acima |
| Update `UNITY_STATUS.md` | 15min | tudo acima |
| **Subtotal Claude (sem Editor humano):** | **~6h** | |
| Passos manuais Felipe | ~2h | tudo acima |
| Smoke + acceptance tests | ~1h | passos manuais |
| **Total real até "DoD checked":** | **~9h** | |

## Acceptance criteria

Spec é aceito quando:
- Felipe revisa este arquivo e dá OK
- Plano de implementação (via `writing-plans` skill) é escrito a partir desse spec
- Cada DoD checkbox tem um teste/comando que prove o check

## Mudanças futuras (próximos slices)

Após este slice, candidatos pra próximo:
- **Slice 2:** iOS embed (espelhar arquitetura, UnityFramework)
- **Slice 3:** Morph targets / blend shapes (DNA → geometria real)
- **Slice 4:** Ateliê UI (customização visual completa)
- **Slice 5:** CI/CD pra AAR (build cloud Unity)
- **Slice 6:** Asset bundles / streaming (reduzir APK)

Cada um vira seu próprio spec.
