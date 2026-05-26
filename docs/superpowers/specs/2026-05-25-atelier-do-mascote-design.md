# Spec — Ateliê do Mascote — Slice 4

**Data:** 2026-05-25
**Autor:** Felipe + Claude
**Status:** Approved for implementation
**Slice:** 4 de N — paralelo ao Slice 1 (Unity Android)

## Contexto

Auditoria revelou:
- **Camada de dados completa:** `lib/dna/customization.ts` + `lib/db/customization.ts` já implementam apply/sanitize/get/update/reset com `withLock` atomic
- **`MorphSlider` pronto:** componente em `components/MorphSlider.tsx` que faz slider [0.7, 1.3] com center mark + reset btn por slider
- **`MascotRenderer` aceita `customization` prop:** preview live é trivial — passa o draft e ele rerenderiza
- **Design system completo:** Typography, useTheme, Chip, ScreenHeader (variant=modal com save action), SectionHeader, PressableScale, expo-haptics
- **Não existe:** tela Ateliê, randomize helper, color/palette picker leve, link de entrada

Hoje a customização visual está espalhada entre:
- `settings/personalization.tsx` (nome, pronome, paleta brand) — NÃO mexe em corpo
- `closet.tsx` (acessórios + cenas) — separado por design

Falta o ponto único de "esculpir" o mascote — daí o Ateliê.

## Definition of Done

- [ ] Nova rota `/atelier` acessível
- [ ] Link de entrada na tela `/mascot` (identity screen)
- [ ] Preview live (180-220px) responde a cada slider em tempo real
- [ ] 6 sliders MorphSlider funcionais: olho tamanho, olho separação, corpo altura, corpo largura, aura intensidade, padrão densidade
- [ ] Chips de padrão (plain/stripes/spots/fractal/cells)
- [ ] 3 toggles de "esconder": cauda, antenas, espinhos
- [ ] Botão "🎲 Aleatório" — gera customização random respeitando clamps
- [ ] Botão "↺ Voltar ao DNA puro" — chama `customization.reset()`
- [ ] Header: ✕ Cancelar / ✓ Salvar
- [ ] Dirty-state tracking — Save desabilitado quando draft == initial
- [ ] Confirmação se cancelar com mudanças pendentes
- [ ] Tests: randomize gera valores dentro do clamp, save persiste, reset volta default
- [ ] Doc nova `ATELIER_DESIGN.md` explicando o flow

## Arquitetura

```
┌─────────────────────────────────────────────────┐
│ /atelier (Expo Router route)                    │
│   - ScreenHeader (modal + save action)          │
│   - Preview area sticky:                        │
│       <MascotRenderer customization={draft} />  │
│   - ScrollView:                                 │
│       SectionHeader "Forma"                     │
│         MorphSlider × 4 (eye/body)              │
│       SectionHeader "Aura & Padrão"             │
│         MorphSlider × 2                         │
│         PatternChips (5 chips)                  │
│       SectionHeader "Apêndices"                 │
│         HideToggleRow × 3                       │
│       Actions row:                              │
│         🎲 Aleatório   ↺ DNA puro                │
└─────────────────────────────────────────────────┘
        ↓ on save
┌─────────────────────────────────────────────────┐
│ customization.update(user_id, draft)            │
│   - withLock atomic                             │
│   - Returns sanitized result                    │
└─────────────────────────────────────────────────┘
        ↓ on store dispatch
┌─────────────────────────────────────────────────┐
│ Store: triggers re-render of all consumers      │
│   - Home mascot                                 │
│   - /mascot identity                            │
│   - /mascot-room (Unity)                        │
└─────────────────────────────────────────────────┘
```

## Componentes novos

### 1. `app/mobile/src/lib/dna/randomizeCustomization.ts`

Helper puro pra gerar customização random "fofa" (não extrema).

```ts
export function randomizeCustomization(user_id: string, seed?: number): MascotCustomization
```

Estratégia: triangular distribution centrada em 1.0 (multiplicadores) e 0 (posture) — produz variações que parecem variações estilísticas, não deformações. Toggles e pattern escolhidos uniformemente.

### 2. `app/mobile/src/components/atelier/PatternChips.tsx`

5 chips horizontais (`plain`, `stripes`, `spots`, `fractal`, `cells`). Tap → seleciona, dispara haptic light. Visual: emoji ilustrativo + label PT-BR.

### 3. `app/mobile/src/components/atelier/HideToggleRow.tsx`

Linha clicável com nome do apêndice + estado on/off visual (checkbox-style). Mascot DNA pode ter cauda/antenas/spikes; toggle permite esconder.

### 4. `app/mobile/app/atelier.tsx`

A tela. Draft state local, push pra DB só no save. Preview sempre renderiza draft.

### 5. Patch em `app/mobile/app/mascot.tsx`

Adicionar link "Abrir Ateliê" no header (rightActions ou botão dedicado).

## Componentes EXISTENTES (não tocar — apenas usar)

- `MorphSlider` — usar tal qual pros 6 sliders
- `MascotRenderer` — passar `customization={draft}`
- `customization.{get,update,reset}` — chamadas diretas
- `applyCustomization` / `clampMultiplier` — re-export pra randomize helper
- `ScreenHeader` (variant modal) — header com save/cancel
- `SectionHeader` — divisórias de seção
- `useTheme`, `Typography`, `PressableScale`, `Chip` — primitivos
- `expo-haptics` — feedback de tap em chips/toggles

## Out of scope

- ❌ Posture slider (range diferente [-0.2, 0.2] — MorphSlider não serve; criar slider próprio é overhead pra um valor secundário)
- ❌ Color picker brand palette — já tá em `/settings/personalization`
- ❌ Acessórios — `/closet` cuida
- ❌ Cenas — `/closet` aba "cenas"
- ❌ Preview Unity (eventual integration via flag — fora desse slice)
- ❌ Comparar antes/depois (modal split) — futuro slice se usuário pedir
- ❌ "Theme presets" (eye-makeup, big-eyes, etc.) — futuro slice
- ❌ Personality / pronome / nome — `/settings/personalization`

## Riscos & mitigação

| Risco | Mitigação |
|---|---|
| Slider laggy em device fraco (rerender mascote 3D a cada drag) | MorphSlider já chama onChange por gesture event; React.memo no MascotRenderer + useMemo nos derivados garantem que só o draft é re-aplicado. Se realmente lag: throttle preview a 30fps |
| Usuário sai sem salvar e perde alterações | Confirmação explícita: "Sair sem salvar?" se isDirty |
| Random gera valor exatamente 1.0 → sem efeito visual | Triangular distribution dá baixa probabilidade — aceitável. Reroll opcional via tap repetido. |
| Toggle "esconder" hides parts que DNA não tem | OK — `applyCustomization` aplica `force_hide_X` só se `morph.hasX` já era true (linha 83-85 do customization.ts). Toggle visual reflete intenção independente da DNA atual. |

## Cronograma estimado

| Workstream | Tempo |
|---|---|
| Spec + commit | 20min |
| randomizeCustomization.ts | 20min |
| PatternChips.tsx | 30min |
| HideToggleRow.tsx | 20min |
| atelier.tsx (tela) | 1.5h |
| Link no /mascot.tsx | 10min |
| Tests | 45min |
| Doc + commit | 30min |
| **Total Claude:** | **~4h** |
