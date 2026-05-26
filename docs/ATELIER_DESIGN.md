# Ateliê do Mascote

**Rota:** `/atelier`
**Entrada:** botão "✨ Ateliê" no header do mascote (em `/mascot`)
**Spec:** `docs/superpowers/specs/2026-05-25-atelier-do-mascote-design.md`

## O que é

Tela única de customização visual do mascote. O usuário "esculpe" o corpo:
proporções, padrões, aura, esconder apêndices. Tudo aplica como **camada
acima do DNA** — nunca muta o genome.

Filosofia: o DNA é a alma (intocável, deterministic), o Ateliê é o look
externo (revertível, reseta pra DNA puro).

## Anatomia

```
┌──────────────────────────────────────────┐
│  ✕  Ateliê                          ✓    │  ← ScreenHeader modal
│     esculpe o seu mascote                │
├──────────────────────────────────────────┤
│                                          │
│         ┌────────────┐                   │
│         │            │                   │
│         │  PREVIEW   │  ← MascotRenderer │
│         │   (240px)  │     com draft     │
│         └────────────┘                   │
│        preview ao vivo                   │
│                                          │
│  ── Forma ──                             │
│    Tamanho dos olhos  [−●────────+]      │
│    Separação dos olhos[−────●────+]      │
│    Altura do corpo    [−──●─────+]       │
│    Largura do corpo   [−────●────+]      │
│                                          │
│  ── Aura & Padrão ──                     │
│    Intensidade aura   [−●────────+]      │
│    Densidade padrão   [−───●─────+]      │
│    [⚪ Liso] [🦓 Listras] [🐆 Pintas]…   │
│                                          │
│  ── Apêndices ──                         │
│    Esconder cauda          [☑]           │
│    Esconder antenas        [☐]           │
│    Esconder espinhos       [☐]           │
│                                          │
│  ── Ações ──                             │
│  [✨ Aleatório]  [← DNA puro]            │
│                                          │
│  🔒 Acessórios e cenas no Closet.        │
│  Customização nunca altera o DNA.        │
└──────────────────────────────────────────┘
```

## Camadas

### Dados (já existente)

- **`MascotCustomization` type** — `app/mobile/src/types.ts`
- **`applyCustomization(morph, custom)`** — `app/mobile/src/lib/dna/customization.ts`
  - Multiplicadores clampados em `[0.7, 1.3]` (`MIN_MULT`/`MAX_MULT`)
  - Posture em `[-0.2, 0.2]` rad
  - Pattern whitelist: `plain`/`stripes`/`spots`/`fractal`/`cells`
  - `force_hide_X` só esconde se DNA tinha — nunca inventa
- **`customization.{get,update,reset}(user_id, patch)`** — `app/mobile/src/lib/db/customization.ts`
  - `update` é atomic via `withLock`
  - `get` retorna defaults se não existe

### UI nova (slice 2026-05-25)

| Arquivo | Responsabilidade |
|---|---|
| `app/mobile/app/atelier.tsx` | Tela principal — draft state + preview + save |
| `app/mobile/src/lib/dna/randomizeCustomization.ts` | Helper: gera customização com triangular distribution |
| `app/mobile/src/components/atelier/PatternChips.tsx` | Chips horizontais pros 5 padrões |
| `app/mobile/src/components/atelier/HideToggleRow.tsx` | Linha clicável com checkbox-style |

### UI reaproveitada

- `MorphSlider` — slider [0.7, 1.3] com center mark + reset por slider
- `MascotRenderer` (prop `customization`) — preview live
- `ScreenHeader` (variant=modal, rightActions) — header com save
- `SectionHeader` — divisórias
- `Chip` (via PatternChips) — pill toggle
- `PressableScale` — actions com spring
- `Icon` — sparkles (random), arrow-left (reset), check (save)
- `expo-haptics` — feedback de tap

## Fluxo de save

```
1. mount  → customization.get(user_id) → setState(initial=draft=current)
2. user edita slider/chip/toggle → setState(draft={...prev, patch})
3. preview rerenderiza com draft (useMemo derivado)
4. user toca ✓ → customization.update(user_id, draft) → router.back()
5. user toca ✕ com isDirty → Alert("Descartar?") → confirm → router.back()
6. user toca ✕ sem dirty → router.back() direto
```

## Randomize

Triangular distribution centrada em 1.0 (multiplicadores) e 0 (posture).
Reduz probabilidade de extremos simultâneos (e.g., olho microscópico + corpo
gigante = mascote deforme). Pattern e toggles uniformes/coinflip.

Seed opcional pra testes: `randomizeCustomization(uid, { seed: 42 })`.

Default `hideProbability=0.15` — raro esconder apêndices.

## Reset

Reset local NÃO persiste imediatamente — só ao salvar. Permite "preview
do reset" antes de commitar.

`customization.reset()` existe na DB mas não é usado direto pela tela
(por design — pra usuário poder cancelar reset).

## Testes

- `app/mobile/tests/lib/dna/randomize-customization.test.ts` — 12 testes
  - Determinismo com seed
  - Bounds garantidas em 200 seeds (multiplicadores + posture)
  - Whitelist de pattern
  - Triangular bias (média ≈ 1.0 em N=500)
  - `hideProbability=0/1` corner cases

## Acessibilidade

- Sliders: `accessibilityRole="adjustable"` + `accessibilityValue` (MorphSlider already)
- Toggles: `accessibilityRole="switch"` + checked state
- Chips: `accessibilityRole="button"` + selected state
- Header actions: labels claros ("Salvar", "Fechar")
- Reduce motion: respeitado pelos primitivos (PressableScale)

## Limites conhecidos

- **Sem posture slider** — range `[-0.2, 0.2]` rad não bate com MorphSlider
  `[0.7, 1.3]`. Posture é persistido se randomize gerar, mas usuário não
  edita manualmente nessa versão. (Slice futuro: criar `RangeSlider`.)
- **Sem color picker** — paleta brand fica em `/settings/personalization`.
- **Sem comparação antes/depois** — possível em slice futuro (modal split).
- **Sem "theme presets"** (eye-makeup, big-eyes) — slice futuro.
- **Preview reage a CADA gesto do slider** — em device fraco pode laggar.
  Mitigação: MascotRenderer já é `React.memo`. Se reportarem lag, throttle.

## Próximos slices candidatos

- Slice X — Posture slider (criar `RangeSlider` pra ranges signed)
- Slice X — Compare modal (split before/after)
- Slice X — Theme presets ("Olhos grandes", "Corpo robusto", etc.)
- Slice X — Personality biases (sliders mexem só em axes alinhados com
  personality dominante — evita destruir identidade)
