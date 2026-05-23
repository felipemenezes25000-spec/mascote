# Arquitetura híbrida Unity — Mascote mobile

## Visão

- **React Native (Expo):** telas, store, DNA, evolução, IA, billing, check-ins — **dono da lógica de negócio**.
- **Unity (`unity/MascotUnityCore/`):** render vivo do mascote, animações procedurais, habitat 3D, reações a hábitos.
- **Contrato versionado:** `app/mobile/src/core/mascot-render-contract/` — JSON `UnityMascotState` v1.

## Fluxo de dados

```
store (Mascot) → buildUnityMascotState() → UnityMascotState JSON
                      ↓
              MascotRenderer (mode via env)
                 ├─ three → Mascot.tsx (R3F / GLB)     ← default produção
                 ├─ unity → UnityMascotView → bridge nativo / stub
                 └─ fallback → three se Unity falhar
```

## Módulos RN (Sprints 1 + 5)

| Caminho | Função |
|---------|--------|
| `src/core/mascot-render-contract/` | Tipos v1, mapper, validate, mappings (18 GLBs) |
| `src/components/MascotRenderer.tsx` | Roteador three \| unity \| fallback2d |
| `src/components/unity/UnityMascotBridge.ts` | postMessage — nativo Android ou stub |
| `src/components/unity/useUnityMascot.ts` | Lifecycle, throttle 10 Hz, pendingEvent |
| `src/components/unity/UnityDebugPanel.tsx` | Overlay debug (env flag) |
| Telas: Home, /mascot, closet, evolution, checkin-result, personalization | `MascotRenderer` |

## Módulos Unity (Sprints 2–3)

| Caminho | Função |
|---------|--------|
| `Scripts/Bridge/` | JSON parse/route, ReactNativeBridge JNI |
| `Scripts/Core/MascotDirector.cs` | Orquestração state.update |
| `Scripts/Core/MascotAccessoryController.cs` | Acessórios + AccessoryRegistry |
| `Scripts/Animation/` | Blink, Breathing, Idle, LookAt, AnimationStateMap |
| `Scripts/Data/AccessoryRegistry.cs` | 18 GLBs + aliases RN |
| `Prefabs/Environment/` | DefaultRoom, CalmRoom stubs |
| `Prefabs/VFX/` | Placeholders celebrate/habit |
| `Scenes/MascotRoom.unity` | Cena principal |
| `Tests/EditMode/` | Parse JSON, router, director |

## Android (Sprint 4)

| Caminho | Função |
|---------|--------|
| `android/unityLibrary/README.md` | Instruções export Unity |
| `android/.../unity/UnityMascotModule.kt` | Bridge stub JNI |
| `plugins/withUnityAndroid.js` | Expo config plugin Gradle |

## iOS (Sprint 6)

| Caminho | Função |
|---------|--------|
| `plugins/withUnityIOS.js` | Stub Podfile |
| `docs/UNITY_IOS_INTEGRATION.md` | Passo a passo Mac |

## Feature flags

```env
EXPO_PUBLIC_MASCOT_RENDERER=three|unity|fallback2d   # default: three
EXPO_PUBLIC_UNITY_ENABLED=true                       # obrigatório p/ unity
EXPO_PUBLIC_UNITY_QUALITY=auto|low|medium|high
EXPO_PUBLIC_UNITY_DEBUG_PANEL=true
EXPO_PUBLIC_UNITY_SIMULATE_FAILURE=true              # testa fallback
```

## Documentação

| Doc | Conteúdo |
|-----|----------|
| `UNITY_BRIDGE_CONTRACT.md` | Schema v1, mensagens |
| `UNITY_ASSET_PIPELINE.md` | GLBs → StreamingAssets |
| `UNITY_ANDROID_INTEGRATION.md` | Export AAR, Gradle |
| `UNITY_IOS_INTEGRATION.md` | UnityFramework, lifecycle |
| `UNITY_PERFORMANCE.md` | FPS, memória, presets |
| `UNITY_FALLBACK_PLAN.md` | Cadeia de fallback |

## CI

| Workflow | Escopo |
|----------|--------|
| `.github/workflows/ci.yml` | Mobile typecheck + lint + tests + unity structure |
| `.github/workflows/mobile-ci.yml` | Alias mobile pipeline |
| `.github/workflows/unity-ci.yml` | Estrutura Unity + grep (sem Editor) |

## O que exige Unity Editor manualmente

1. Importar GLBs como prefabs (ou GLTFast)
2. Wiring cena MascotRoom (Director, lights, MascotRoot bones)
3. Export Android Library → `android/unityLibrary/`
4. Export iOS UnityFramework (Mac)
5. Animator clips reais (stub procedural funciona até lá)

## Limitações conhecidas

- Runtime Unity 3D não embutido no APK até export manual
- Bridge Android callable mas `isAvailable=false` sem AAR
- iOS só documentado + plugin stub
- Default renderer permanece **three** — zero breaking change
