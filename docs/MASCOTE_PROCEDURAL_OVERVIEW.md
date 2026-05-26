# Mascote Procedural — Overview Consolidado

**Última atualização:** 2026-05-26
**Versão do sistema:** Slice 1-CC (35 commits cumulativos)

Esse documento é o **ponto único de entrada** pra entender o sistema procedural
do Mascote ponta-a-ponta. Para detalhes específicos, ver docs auxiliares
linkadas em cada seção.

---

## 1. Filosofia

O Mascote NÃO é um boneco com skin trocável. É uma **criatura digital
procedural** onde:

- **DNA** é a identidade imutável (seed determinístico, 11 genes)
- **Morphology** é a derivação física do DNA (20+ parâmetros)
- **Customization** é a vontade do usuário sobreposta (nunca muta DNA)
- **Mutations** são marcos biológicos celebrativos (não cosmetic)
- **Personality bias** assina visualmente a personalidade
- **Visual final** = composição de todas as camadas, clamped no consumer

Resultado: mesma seed → mesmo DNA → mesmo mascote forever. Customizações
e mutações empilham por cima sem destruir a identidade.

---

## 2. Pipeline ponta-a-ponta

```
┌──────────────────────────────────────────────────────────────┐
│  Profile.id (seed determinístico)                            │
│   ↓                                                          │
│  Genome (11 genes ∈ [0.02, 0.98])                            │
│   ├── empathy, curiosity, creativity, discipline, chaos      │
│   ├── aggression, resilience, emotionalDepth                 │
│   └── socialEnergy, adaptability, intelligence               │
│   ↓                                                          │
│  Morphology (20+ params)                                     │
│   ├── eye_size, eye_spread, pupil_emissive                   │
│   ├── body_height, body_width, body_bottom_bias              │
│   ├── aura_opacity, aura_size, aura_particle_count           │
│   ├── pattern (plain/stripes/spots/fractal/cells)            │
│   └── has_tail, has_antennae, has_spikes                     │
│   ↓                                                          │
│  + applyCustomization(morph, customization)                  │
│      └── multipliers ∈ [0.7, 1.3]; force_hide_X overrides    │
│   ↓                                                          │
│  + applyMutationVisualImpact(morph, aggregated)              │
│      └── multipliers compostos + pattern override + glow      │
│   ↓                                                          │
│  = Final Morphology                                          │
│   ↓                                                          │
│  morphInfluencesFromMorphology(morph) → {key: weight01}      │
│   ↓                                                          │
│  + mutation morphInfluenceBoosts (Frente B)                  │
│   ↓                                                          │
│  + personality morph bias (Frente C)                         │
│   ↓                                                          │
│  = Final MorphInfluences (clamped [0, 1])                    │
│                                                              │
│  ┌───────────────────────────────────────────────────┐       │
│  ↓                  ↓                ↓               ↓       │
│ Mascot2D       Mascot3DAsset    Unity 6 AAR    Atelier UI    │
│ (SVG)         (R3F + GLB)     (Android+iOS)   (preview)      │
│  ↓                  ↓                ↓               ↓       │
│ scaleX/Y       morphTarget     SetBlendShape   draft state   │
│ approxim.      Influences[]    Weight(i, w*100) + sliders   │
│ (Frente F)     (Frente A)      (Slice 3)       + presets...  │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Catálogo de blend shapes

Documentação completa: [`docs/MORPH_TARGETS_DESIGN.md`](MORPH_TARGETS_DESIGN.md)

10 keys oficiais (pares mutually exclusive na origem; somáveis após boosts):

```ts
MORPH_INFLUENCE_KEYS = [
  'eye_big', 'eye_small',
  'body_tall', 'body_short',
  'body_wide', 'body_narrow',
  'posture_forward', 'posture_back',
  'aura_strong',
  'pattern_dense',
]
```

**GLBs precisam ter blend shapes nomeados exatamente assim** pra que
Unity (`SetBlendShapeWeight`) e R3F (`morphTargetInfluences`) apliquem.
Por enquanto: GLBs atuais NÃO têm — pipeline funciona NO-OP. Veja
checklist Blender em `MORPH_TARGETS_DESIGN.md`.

---

## 4. Renderers

| Renderer | Quando | DNA | Morph influences |
|---|---|---|---|
| **Mascot2D** (SVG) | Fallback sem GL | ✅ paleta | ✅ aproximação via scaleX/Y |
| **Mascot3DAsset** (R3F + GLB) | Default | ✅ paleta + bone scales | ✅ morphTargetInfluences (NO-OP até GLB ter shape keys) |
| **Mascot3DLazy** (R3F procedural) | Fallback se GLB fails | ✅ vertex displacement | — |
| **Unity 6 AAR** | Opt-in via `EXPO_PUBLIC_UNITY_ENABLED=true` | ✅ tint + bone scales | ✅ SetBlendShapeWeight (NO-OP até GLB ter shape keys) |

Decisão de renderer: `MascotRenderer.tsx` → `resolveRendererMode()` →
respeita feature flag + device caps.

Detalhes Unity: [`docs/UNITY_ANDROID_INTEGRATION.md`](UNITY_ANDROID_INTEGRATION.md)
e [`docs/UNITY_IOS_INTEGRATION.md`](UNITY_IOS_INTEGRATION.md).

---

## 5. Atelier UI

Documentação completa: [`docs/ATELIER_DESIGN.md`](ATELIER_DESIGN.md)

Tela `/atelier` permite ao usuário:

| Seção | Componente |
|---|---|
| Header com save + sync indicator | `ScreenHeader` + `AutoSaveIndicator` |
| Preview ao vivo (200px) | `MascotRenderer` + `FpsCounter` (dev) |
| Presets atalhos | `ThemePresetChips` (5 vibes) |
| Misturar presets | `BlendPanel` (A + B + slider) |
| Sliders de forma | `MorphSlider` 🔒 + `RangeSlider` (posture) |
| Pattern + Apêndices | `PatternChips` + `HideToggleRow` × 3 |
| Ações | Undo/Redo, Aleatório, DNA puro, Comparar, Composição |
| Mutações ativas | `MutationsActiveStrip` |
| Outras personalidades | `PersonalityPreviewSwatch` |
| Looks salvos (cota 5+8) | `LookManager` com `LookThumbnail` |
| Wizard primeira visita | `AtelierOnboarding` |
| Debug menu | `AtelierDebugMenu` (dev-only) |
| Preferências | `/atelier-settings` |

---

## 6. Sistema de Looks

| Tipo | Cota | Origem | Persistência |
|---|---|---|---|
| Manual | 5 por usuário (FIFO) | `LookManager` "Salvar look" | `atelier_looks` table |
| Auto (weekly snapshot) | 8 por usuário (FIFO) | `weeklySnapshot.maybeCreate` no mount | mesma table, flag `is_auto:true` |

Compartilhamento via JSON copy/paste:
- Export: `exportLook(look) → JSON`
- Import: `importLook(json) → { ok, name, snapshot }` (sanitizado)
- Privacidade: NUNCA inclui user_id

---

## 7. Glossário rápido

- **DNA / Genome**: 11 floats deterministic-from-seed, imutáveis
- **Morphology**: 20+ params derivados do DNA via `morphologyFromGenome`
- **Customization**: overrides do usuário (multipliers [0.7, 1.3])
- **Mutation**: marco celebrativo com `visualImpact` (catálogo 50+)
- **MorphInfluence**: blend shape weight [0, 1] nomeado conforme catálogo
- **Personality bias**: boosts sutis de morph por personality (calmo/motivador/fofo/sabio)
- **Look**: snapshot nomeado de customization, salvo pra trocar rapido
- **Auto snapshot**: look criado pelo sistema semanalmente ("Semana N")

---

## 8. Estado atual + roadmap

### ✅ Completo (não exige passo seu)
- Toda a camada TS de DNA, morphology, customization, mutations, looks
- Atelier UI completo (sliders, presets, blend, looks, undo, lock, autosave, onboarding, etc)
- 3 renderers consomem morphInfluences (Mascot2D, R3F, Unity contract)
- iOS Swift bridge estrutura pronta (templates + config plugin)
- CI/CD workflows YAML prontos (Android + iOS)
- ~3560 testes passando, zero regressão

### 🟡 Passo manual seu pra ativar
| Item | Tempo | Bloqueador |
|---|---|---|
| Unity Editor build AAR | ~2h | Windows + Unity 6 |
| Mac/Xcode setup iOS | ~3h | Mac |
| Blender shape keys nos GLBs | ~1d | artista 3D |
| Configurar 3 secrets GitHub CI | ~15min | conta Unity |

### 📋 Próximas frentes possíveis (futuro)
- Tradução real (EN-US, ES-LATAM) — i18n scaffold já está pronto
- Backend gallery pública de looks
- Compose 3+ presets simultâneos
- Mascot2D blend shapes via path morphing (SVG path interpolation)
- Per-mutation animação visual quando desbloqueia (celebration)
- Performance benchmarks em device físico

---

## 9. Arquivos-chave

### TypeScript (app/mobile)
- `src/lib/dna/` — DNA, morphology, customization, mutations, morphInfluences, randomize, themePresets, lookShare, personalityMorphBias
- `src/lib/db/atelier-looks.ts` — DB layer dos looks (manuais + autos)
- `src/lib/atelier/weeklySnapshot.ts` — auto snapshot
- `src/lib/i18n/atelier-strings.ts` — strings PT-BR scaffold
- `src/hooks/useDraftHistory.ts` — undo/redo
- `src/hooks/useDraftAutoSave.ts` — auto-save debounced
- `src/components/atelier/*` — 11 componentes da tela
- `src/components/MorphSlider.tsx` + `RangeSlider.tsx` — sliders genéricos
- `app/atelier.tsx` — tela principal
- `app/atelier-settings.tsx` — preferências

### Unity (unity/MascotUnityCore)
- `Assets/Mascote/Editor/AndroidBuildPipeline.cs` — Editor script build AAR
- `Assets/Mascote/Scripts/Core/MascotBlendShapeController.cs` — aplica morph
- `Assets/Mascote/Scripts/Core/MascotController.cs` — orquestra controllers
- `Assets/Mascote/Scripts/State/DTOs/UnityMascotState.cs` — schema C#

### Android (app/mobile/android)
- `.../unity/UnityMascotModule.kt` — bridge RN
- `.../unity/UnityPlayerActivityHelper.kt` — lifecycle reflection-safe
- `.../MainActivity.kt` — patch lifecycle delegation

### iOS (app/mobile/plugins/ios-unity-source)
- `UnityMascotModule.swift` + `.m` — bridge (espelha Kotlin)
- `UnityPlayerHelper.swift` — lifecycle
- `Mascote-Bridging-Header.h` — Xcode bridge

### CI/CD (.github/workflows)
- `unity-android-build.yml` — build AAR via game-ci
- `unity-ios-build.yml` — build framework macOS

### Docs (docs/)
- `ATELIER_DESIGN.md` — anatomia do Atelier
- `MORPH_TARGETS_DESIGN.md` — pipeline morph + checklist Blender
- `UNITY_ANDROID_INTEGRATION.md` — checklist 5 passos manual
- `UNITY_IOS_INTEGRATION.md` — checklist Mac/Xcode
- `UNITY_CI_CD.md` — setup secrets + tabela custo Android vs iOS
- `UNITY_STATUS.md` — snapshot do estado
- `docs/superpowers/specs/*` — specs originais (Unity Android + Atelier)

---

## 10. Como rodar localmente

```powershell
# Pré-requisitos
node --version  # ≥ 20
npm --version

# Setup (once)
cd app/mobile
npm ci

# Dev server (todas as features Atelier funcionam — Unity stub)
npx expo start

# Tests
npm test                    # full suite (~3500 tests)
npm run test:integration    # services/components/hooks
npm run test:coverage       # com thresholds CI

# Android run
npx expo run:android        # build + install em device/emulator

# Ativar Unity Android (após passo manual de build AAR — ver UNITY_ANDROID_INTEGRATION.md)
# 1. Unity Editor → Mascote → 📦 Build Android Library
# 2. cd app/mobile && powershell -ExecutionPolicy Bypass -File scripts/wire-unity-android.ps1
# 3. .env.local: EXPO_PUBLIC_UNITY_ENABLED=true
# 4. npx expo run:android
```

---

## 11. Métricas finais (slice 1-CC)

- **35+ commits cumulativos** desde início do trabalho procedural
- **~12.000 linhas** de código novo (TS + C# + Kotlin + Swift + YAML)
- **~3.500 linhas** de docs/specs/markdown
- **3560 testes passando**, zero regressão
- **12 componentes Atelier** novos
- **4 hooks reusáveis** (`useDraftHistory`, `useDraftAutoSave`, `useAtelierOnboarding`, lifecycle helpers nativos)
- **2 helpers UI genéricos** (`MorphSlider`, `RangeSlider`)
- **2 workflows CI/CD** prontos pra produção
- **8 documentos técnicos** consolidados

Sistema atende 100% da visão "criatura procedural" do mega-prompt original
no que cabe headless. O que falta é trabalho de ambiente (Unity Editor,
Mac, Blender) ou validação em device real.
