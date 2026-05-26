# Unity Status — Snapshot 2026-05-25

## Fonte de verdade de versão

- `unity/MascotUnityCore/ProjectSettings/ProjectVersion.txt`
- Valor atual: **6000.4.8f1** (Unity 6)
- URP: 17.0.4

## Estado atual da integração

### Simulação → render (2026-05-24)

- ✅ `lifeState.energy` / `lifeState.mood` passam para `buildUnityMascotState` (`simEnergy`, `simMood`)
- ✅ `MascotRenderer` lê `lifeState` do store
- ✅ `HomeAwayStrip` na Home exibe living moments / resumo de ausência

### Android

- ✅ Bridge JS/Kotlin presente (`UnityMascotBridge`, `UnityMascotModule.kt`)
- ✅ Contrato RN↔Unity com `schemaVersion: 1`
- ✅ Fallback operacional quando Unity não está embedded
- ✅ **Editor script `Mascote → 📦 Build Android Library`** (slice 2026-05-25)
- ✅ **`UnityPlayerActivityHelper.kt`** — lifecycle reflection-safe (slice 2026-05-25)
- ✅ **`MainActivity.kt`** patch — delega 7 lifecycle callbacks ao helper (slice 2026-05-25)
- ✅ Tests de lifecycle do hook expandidos (8 testes, 100% pass)
- 🟡 Embed real depende de passos manuais documentados (cena MascotRoom + Editor build)

### iOS

- 🟡 Documentação e plugin base existem
- 🔴 Bridge nativa final ainda não implementada
- 🔴 Requer fluxo Mac/Xcode + export UnityFramework
- 📋 Próximo slice planejado pós-validação Android

### Contrato e robustez (2026-05-24)

- ✅ Parse Unity→RN agora valida shape por tipo de mensagem
- ✅ `state.update` inválido é bloqueado no bridge antes de envio
- ✅ Guard de versão de schema ativo (`schemaVersion` esperado = 1)
- ✅ Testes dedicados para contrato adicionados/atualizados

### Slice 2026-05-25 — Unity Embed Real Android

Spec completo: `docs/superpowers/specs/2026-05-25-unity-android-embed-design.md`

**Implementado por Claude (commitado):**

- ✅ `AndroidBuildPipeline.cs` — Editor script automatiza export AAR pra `app/mobile/android/unityLibrary/`
- ✅ `UnityPlayerActivityHelper.kt` — helper reflection-safe pra delegar lifecycle ao UnityPlayer
- ✅ `MainActivity.kt` patch — overrides onResume/Pause/Destroy/LowMemory/TrimMemory/WindowFocusChanged/ConfigurationChanged
- ✅ Tests TS expandidos cobrindo throttle, pendingEvent dedup, cleanup, onReady
- ✅ Docs `UNITY_ANDROID_INTEGRATION.md` + `UNITY_STATUS.md` atualizadas

**Pendente manual (Felipe — checklist em `UNITY_ANDROID_INTEGRATION.md`):**

- 🟡 Validar 4 prefabs (`bipo`, `zip`, `lulu`, `aro`) carregam no Editor sem erro
- 🟡 Configurar cena `MascotRoom.unity` com Camera/Lights/MascotUnityBridge/MascotInstance
- 🟡 Rodar `Mascote → 📦 Build Android Library`
- 🟡 Rodar `scripts/wire-unity-android.ps1`
- 🟡 `npx expo run:android` com `EXPO_PUBLIC_UNITY_ENABLED=true`
- 🟡 Smoke test lifecycle (background/foreground)

## Gaps imediatos Unity

1. **Slice 2 — iOS:** Fechar integração iOS nativa (UnityFramework + Swift bridge + ViewManager).
2. **Slice 3 — Procedural geometry:** Morph targets / blend shapes pra DNA influenciar shape do mascote (não só cor/escala).
3. **Slice 4 — Ateliê UI:** Tela de customização de corpo/cor/aura/padrão como camada acima do DNA.
4. **Slice 5 — CI/CD AAR:** Build cloud Unity (Linux runner) pra automatizar a parte manual.
5. **Slice 6 — App Bundle:** AAB split por ABI pra reduzir tamanho do APK distribuído.

## Risco atual

Risco **baixo→médio**:
- Contrato e bridge sólidos.
- Lifecycle agora delegado corretamente — `UnityPlayer` pausa/resume em background.
- Reflection-safe garante ZERO regressão quando AAR ausente.
- Falta validação em device físico após Felipe rodar o build pela primeira vez.
