# Backlog DLI-v2 — Specs Executáveis

> **STATUS (2026-05-19 — DLI-v3)**: ✅ **TODAS 5 SPECS ENTREGUES.**
> Ver detalhes individuais em cada seção. Backlog mantido pra histórico —
> próximas fases foram movidas pra `ROADMAP_DIGITAL_LIVING_IDENTITY.md` como
> trabalho de infra (backend, push, billing) + refinamento (shaders, voz,
> memory graph).

> 5 tickets multi-dia, prontos pra dev pegar e executar.
> Cada spec é **self-contained**: contexto, entregáveis, design notes, testes obrigatórios, definição de pronto.
> Ordem sugerida abaixo respeita dependências.

**Sequência executada**: SPEC-5 → SPEC-1 → SPEC-3 → SPEC-2 → SPEC-4

| Spec | Status | Validação |
|---|---|---|
| **SPEC-1** Evolution screen procedural | ✅ Done | timeline + viewer genoma + próximo marco |
| **SPEC-2** Customização Sims/Spore | ✅ Done | 6 sliders + postura + 3 toggles + reset |
| **SPEC-3** Animations Mascot3D | ✅ Done | breath, blink, eye-track, posture, bounce, mouth, aura mood-reactive, sparkle burst, imperative actions |
| **SPEC-4** Behavior Engine | ✅ Done | 6 behaviors (2 DNA-driven), engine selector, useBehaviorTick hook integrado |
| **SPEC-5** Mutations integration | ✅ Done | 7 mutações persistentes, 4 raridades, integração check-in pipeline + UI catálogo |

---

## SPEC-1 — Evolution screen procedural (recriação completa)

**Esforço estimado**: 4-6 dias.
**Dependências**: nenhuma (mutations module + descriptors já existem).
**Status atual**: tela já tem card "Identidade procedural" demoting linear phases (entregue na sessão DLI-v2). Falta a recriação TOTAL como timeline biológica.

### Contexto

A tela `app/(tabs)/evolution.tsx` ainda mantém milestones lineares (ovo→bebê→criança→...) como referência secundária. O brief DLI pede experiência **procedural infinita**. O Card de "Identidade procedural" já existe e cumpre 30% — falta a **timeline biológica** e o **viewer de genoma**.

### Entregáveis

1. **Substituir `phaseList`** (a esteira numerada 1→6) por uma **timeline biológica** que mostra:
   - Mudanças recentes de DNA (de `dominantChange` em últimos N dias)
   - Mutações desbloqueadas (com data + raridade visual)
   - Próximo marco biológico previsto (mutação mais próxima de unlock baseado em `evaluateCondition` parcial)
   - Sem números de XP visíveis ao usuário; só narrativa

2. **Viewer de genoma** — secção colapsável "ver detalhes":
   - 11 barras horizontais com label PT-BR amigável (não "empathy", mas "afeição visível")
   - Mostra valor relativo (curto, alto, médio) sem expor número
   - Cor da barra puxada do `paletteFromGenome`
   - Tap em barra mostra micro-descrição (vocabulário: "olhos maiores", "postura mais firme", etc.)

3. **Histórico de transformações** — lista cronológica:
   - Cada item: data + ícone de raridade + nome da mutação + body description
   - Use `MUTATION_CATALOG` filtrado por `mascots.dna_mutations` (nova tabela em SPEC-5)
   - Empty state: "Ainda não houve mutações. Seu ritmo decide o ritmo dela."

4. **Próximo marco** (preview):
   - Roda `findNewlyUnlockedMutations` com condições atuais
   - Mostra a mutação MAIS PRÓXIMA de unlock (gap menor) sem revelar a condição exata
   - Copy: "Algo está chegando — sinto na forma dela. Cuide de você."

5. **Manter** `XPBar` (level/progress mecânico ainda é útil) mas **mover pra baixo** da timeline.

### Design notes

- Linguagem: zero menção de "fase X", "evolução para Y". Use: "marco", "transformação", "mudança recente".
- Visual: hero da tela é o mascote + o card de identidade. O resto rola scroll.
- Cor: mutações legendárias têm border `accent` da paleta; epic = `primary`; rare = `border`; common = sem destaque.
- Acessibilidade: cada item da timeline tem `accessibilityLabel` completo.

### Tests obrigatórios

- `tests/components-evolution-procedural.test.tsx`:
  - Render com DNA neutro → timeline vazia + empty state correto
  - Render com 3 mutações desbloqueadas → 3 items na timeline em ordem cronológica reversa
  - Próximo marco aparece apenas se há candidato (não inventar)
  - Viewer de genoma respeita reduceMotion (sem animação de barra se off)
- Atualizar `tests/components-core.test.tsx` se quebrar import.

### Definição de pronto

- [ ] Nenhuma string PT-BR exposta contém "fase"
- [ ] `phaseList` original removido
- [ ] Timeline biológica funcional com 1+ mutação desbloqueada
- [ ] Tap no viewer de genoma expande/colapsa
- [ ] Próximo marco preview funcional
- [ ] Tests novos + suite anterior verde
- [ ] Maestro flow `evolution-procedural.yml` cobre fluxo principal

---

## SPEC-2 — Customize.tsx Sims/Spore (morph sliders)

**Esforço estimado**: 8-12 dias.
**Dependências**: SPEC-3 (blend shapes em Mascot3D).
**Status atual**: `app/customize.tsx` tem só personality/acessório/cenário/humor/paleta/nome — básico. Zero controle morfológico.

### Contexto

O brief pede customização nível "The Sims + Spore". Hoje é apenas "trocar skin". A meta é: usuário INFLUENCIA o corpo da criatura (não controla totalmente — DNA define limites).

### Princípio inviolável

**Sliders NÃO mutam o DNA bruto.** Eles persistem em `customization_overrides` (novo tipo) que o renderer interpola sobre `morphologyFromGenome` (ex: `eyeSize_multiplier = 1.15` aplicado em runtime). DNA permanece intocável — protege identidade procedural.

### Entregáveis

1. **Novo tipo**: `MascotCustomization` em `src/types.ts`:
```ts
export interface MascotCustomization {
  user_id: string;
  // Cada override é multiplicador em [0.7, 1.3] — limita drift longe da identidade
  eye_size?: number;
  eye_spread?: number;
  body_height?: number;
  body_width?: number;
  aura_intensity?: number;
  pattern_density?: number;
  // Não-numérico
  preferred_pattern?: BodyPattern; // 'plain'|'stripes'|'spots'|'fractal'|'cells'
  // metadata
  updated_at: string;
}
```

2. **Nova tabela** `customization` em `db.ts` com upsert per-user.

3. **Refatorar `app/customize.tsx`** com 3 sub-tabs:
   - **Aparência** (sliders): eye_size, eye_spread, body_height, body_width, aura_intensity, pattern_density
   - **Detalhes**: preferred_pattern (radio picker), accessories (mantém atual), scene picker (mantém atual)
   - **Identidade**: personality picker (mantém atual), nome (mantém atual)

4. **Slider component reutilizável** em `src/components/MorphSlider.tsx`:
   - Range [0.7, 1.3] visualizado [-30%, +30%]
   - Reset button (1.0)
   - Preview LIVE do mascote no card

5. **Mascot3D consumer** lê customization e aplica:
```ts
const morph = morphologyFromGenome(dna);
const tuned: Morphology = {
  ...morph,
  eyeSize: morph.eyeSize * (custom?.eye_size ?? 1),
  // ... outros campos
};
```

### Design notes

- Limites [0.7, 1.3] **inegociáveis** — sem isso, usuário pode "destruir" criatura
- Reset all em 1 botão (volta DNA-puro)
- Persistência: per-user, sobrevive a reinstalar somente com backend (futuro)
- Mostrar contagem de "ajustes feitos" no header pra dar peso

### Tests obrigatórios

- `tests/customize-morph.test.tsx`:
  - Slider fora de range é clampado
  - Preview reflete mudança em tempo real (re-render Mascot)
  - Reset zera tudo
  - Persistência → recarga preserva valores
- `tests/lib/customization.test.ts`: validate, sanitize, default helpers

### Definição de pronto

- [ ] 6 sliders funcionais com clamp
- [ ] Preview live (Mascot3D atualiza ao mover slider)
- [ ] Persistência em AsyncStorage tabela `customization`
- [ ] Reset funcional
- [ ] DNA bruto NÃO muda (test trava)
- [ ] Bottom sheet com "explicar" pro user entender o cap

---

## SPEC-3 — Mascot3D animation pipeline (blink + breath + eye-track + posture)

**Esforço estimado**: 10-15 dias.
**Dependências**: nenhuma. **Unlock** pra SPEC-2.
**Status atual**: Mascot3D renderiza corpo procedural estático. Olhos com `look` state existe via PanResponder mas não está conectado eficazmente à pupila.

### Contexto

Sem animação, a criatura parece "stuck". Brief pede "vivo". As 4 animações nucleares:

### Entregáveis

1. **Breath cycle** (sutil, contínuo):
   - Body scale Y: 1.0 ↔ 1.02 em ciclo de `breathFreq` segundos
   - `breathFreq` puxado de `morphology.breathFreq` (DNA-driven)
   - Use `useFrame` do R3F, ref em mesh
   - **Pause em reduceMotion**

2. **Blink** (aleatório):
   - A cada 3-6s (random), olhos fecham 80ms (scale Y do mesh dos olhos: 0.1)
   - Determinístico via timer (não DNA-driven)
   - Pause em reduceMotion

3. **Eye tracking** (já tem base via PanResponder em [Mascot3D.tsx](../../app/mobile/src/components/Mascot3D.tsx)):
   - `look` state precisa transformar em **offset da pupila** (não da cabeça)
   - Suavização via lerp: pupila acompanha `look` com `trackingSpeed` (DNA-driven, já existe em morphology)
   - Idle: pupila sutilmente errante (random walk leve quando user não toca)

4. **Mood-driven posture**:
   - `mascot.mood` afeta tilt do body group:
     - `triste`: -5° em X
     - `exausto`: -8° em X, scale Y 0.95
     - `ok`: 0°
     - `feliz`: +2° + bounce sutil
     - `empolgado`: +4° + bounce mais energético
   - Lerp suave entre estados (não pulo instantâneo)

5. **Reactive touch** (já tem PanResponder):
   - Tap rápido (sem pan) → bounce visual (scale 1.0 → 1.08 → 1.0 em 250ms)
   - Pan → eye tracking (já feito)

### Design notes

- TUDO via `useFrame` + `useRef<Mesh>` — sem state React (evita re-render)
- Performance: usar `Group` pra agrupar transforms ao invés de mexer em mesh diretos
- Easing: `MathUtils.lerp` do three.js, fator ~0.1 por frame
- **Sem behavior tree** ainda — animações são reativas direto a state. Behavior tree é SPEC-4.

### Tests obrigatórios

- Hard de testar via Vitest (mock R3F). Validar via:
  - Snapshot teste de Mascot3D props
  - Playwright canvas pixel diff (mascote MUDA visualmente quando mood muda)
  - Maestro flow `mascot-3d-react.yml`

### Definição de pronto

- [ ] Mascote respira em loop visível
- [ ] Mascote pisca em intervalo aleatório
- [ ] Pupila acompanha o dedo do usuário (suave, não snap)
- [ ] Mood diferente produz postura diferente visivelmente
- [ ] Tap dispara bounce
- [ ] Tudo respeita `reduceMotion`
- [ ] 60fps sustentável em iPhone 11 / Pixel 5

---

## SPEC-4 — Behavior Engine (utility AI + behavior tree)

**Esforço estimado**: 12-18 dias.
**Dependências**: SPEC-3 (animations pra "executar" behaviors).
**Status atual**: zero. Heurísticas em `proactive.ts` são triggers binários simples.

### Contexto

Mascote precisa "pensar" sozinho. Não pra simular consciência — pra dar sensação de presença autônoma. Behaviors são reações contextuais que rodam mesmo quando user não interage.

### Entregáveis

1. **Estrutura nova**: `src/lib/behavior/`:
   - `behavior.ts` — types (`Behavior`, `Context`, `Score`)
   - `behaviors/` — pasta com behaviors específicos (idle, greet, react-to-streak, etc.)
   - `engine.ts` — utility AI selector
   - `tree.ts` — composição em tree (sequence, selector, parallel)

2. **Tipo `Behavior`**:
```ts
export interface Behavior {
  id: string;
  /** Score 0-1: quão "apropriado" rodar agora. */
  score: (ctx: BehaviorContext) => number;
  /** Custo de tempo (s). Behaviors em cooldown não competem. */
  duration: number;
  /** Lado-efeito: animação, notif, mudança visual. NÃO muta DB. */
  execute: (ctx: BehaviorContext) => Promise<void>;
}
```

3. **`BehaviorContext`**:
```ts
export interface BehaviorContext {
  mascot: Mascot;
  dna: Genome;
  hoursSinceLastInteraction: number;
  streakCurrent: number;
  recentMoodTrend: 'rising' | 'falling' | 'stable';
  hour: number;
  // ...
}
```

4. **7 behaviors iniciais**:
   - `idle_breath` — score 0.1 (sempre), duration 5s — só respira
   - `idle_wander_eyes` — score 0.3 quando hoursSinceLastInteraction > 1, duration 8s
   - `react_to_streak_milestone` — score 1.0 quando streak%7==0 e não disparado hoje, duration 3s
   - `react_to_long_absence` — score 0.8 quando hoursSinceLastInteraction > 48
   - `react_to_return` — score 0.9 quando recém-aberto após >24h
   - `react_to_touch` — score 1.0 imediatamente após PanResponder (handled by ref)
   - `quiet_observation` — score 0.5 quando hour > 22 ou < 6 — postura mais quieta

5. **Engine**:
   - A cada 5s, computa `score(ctx)` de cada behavior elegível
   - Seleciona MAIOR score
   - Executa (chama animação via ref no Mascot3D)
   - Marca timestamp pra cooldown

6. **Integração com Mascot3D**:
   - Mascot3D expõe `useImperativeHandle` com métodos: `playBreathe()`, `playBounce()`, `playWander()`, `setPosture(mood)`, etc.
   - Behavior engine chama esses métodos

### Tests obrigatórios

- `tests/lib/behavior/engine.test.ts`:
  - Score determinístico
  - Cooldown previne dupla execução
  - Higher score wins
- `tests/lib/behavior/behaviors/*.test.ts` — cada behavior individual
- Property-based: nenhum behavior corrompe DNA/mascot

### Definição de pronto

- [ ] 7 behaviors implementados e testados
- [ ] Engine roda a cada 5s sem block UI
- [ ] Mascote "se comporta" sozinho visivelmente quando user observa
- [ ] Reação a retorno após ausência dispara <500ms após open

---

## SPEC-5 — Mutations integration em checkin pipeline + UI

**Esforço estimado**: 5-8 dias.
**Dependências**: módulo mutations já criado (entregue DLI-v2).
**Status atual**: módulo `src/lib/dna/mutations.ts` + testes existem. **Não está integrado no pipeline de check-in nem na persistência.**

### Contexto

Mutations existem como código puro. Pra serem REAIS no app: checkin precisa avaliar quando uma é desbloqueada, persistir, e UI precisa mostrar toast + permanência.

### Entregáveis

1. **Nova tabela** `dna_mutations` em `db.ts`:
```ts
// rows do tipo UnlockedMutation
// API:
//   mutations.listForUser(user_id): Promise<UnlockedMutation[]>
//   mutations.unlock(user_id, mutation_id): Promise<UnlockedMutation | null>
//   mutations.idsForUser(user_id): Promise<Set<string>>
```

2. **Integração em `applyCheckinFully` ([checkin.ts](../../app/mobile/src/lib/checkin.ts))**:
   - APÓS drift de DNA, ANTES de processUnlocks:
   ```ts
   if (finalMascot.dna) {
     const ctx: MutationContext = {
       genome: finalMascot.dna,
       habitCheckinCounts: await countCheckinsPerHabit(profile.id),
       currentStreak: streakResult.streak.current_streak,
       daysSinceCreated: daysSince(mascot.created_at),
       alreadyUnlocked: await mutations.idsForUser(profile.id),
     };
     const newlyUnlocked = findNewlyUnlockedMutations(ctx);
     for (const m of newlyUnlocked) {
       await mutations.unlock(profile.id, m.id);
       // Enqueue UnlockToast com data { kind: 'mutation', name, rarity }
     }
   }
   ```

3. **Helper** `countCheckinsPerHabit(user_id)` — pode reusar `checkins.byHabitInRange` ou criar agregador específico.

4. **UnlockToast type extension**:
```ts
type UnlockToastData =
  | { kind: 'accessory'; ... }
  | { kind: 'scene'; ... }
  | { kind: 'achievement'; ... }
  | { kind: 'mutation'; name: string; description: string; rarity: MutationRarity };
```

5. **Mascot3D consumer**:
   - Mascot3D lê lista de mutations unlocked do user
   - Compõe `aggregatedVisualImpact` via `aggregateVisualImpact(ids)`
   - Aplica multipliers em morphology antes de renderizar
   - Pattern: aplica shader (futuro — placeholder por enquanto)

6. **Mutations preview screen** (`app/mutations.tsx`, novo):
   - Lista todas MUTATION_CATALOG
   - Visualmente diferencia unlocked vs locked
   - Locked: descrição vaga, nome obscurecido
   - Unlocked: nome + descrição + data + raridade

7. **Migration v2→v3** em `db.ts`:
   - Adiciona tabela `dna_mutations` vazia
   - Idempotente

### Tests obrigatórios

- `tests/security/dna-mutations-integration.test.ts`:
  - Check-in dispara mutation se condição satisfeita
  - Mutation persistida sobrevive a reload
  - Mutation NÃO se duplica
  - Migration v2→v3 idempotente
- `tests/lib-checkin-mutations.test.ts`:
  - applyCheckinFully retorna `unlocks.mutations[]`
  - Multiple mutations no mesmo check-in vão pro toast queue

### Definição de pronto

- [ ] Tabela `dna_mutations` criada via migration v3
- [ ] applyCheckinFully integra avaliação
- [ ] UnlockToast renderiza mutation com raridade visual diferente
- [ ] Mascot3D aplica multipliers visuais (não-shader; pattern fica em TODO)
- [ ] Tela `/mutations` lista catálogo com lock state
- [ ] 6+ tests novos cobrem o pipeline

---

## Como pegar uma spec

1. Crie branch `feat/dli-spec-N-{short-name}`
2. Trabalhe em commits atômicos por entregável
3. Mantenha `npm test` verde a cada commit
4. PR mostra checklist de "definição de pronto"
5. Se algo desviar do spec, **documente o porquê** no PR description

## Itens fora do escopo desta queue

- Behavior tree para conversação (IA influenciando chat com base em behavior) — bound to SPEC-4 final
- Voz procedural (DLI-7) — esperar até SPEC-3 + SPEC-4 maduros
- Ambient reactive (DLI-6) — esperar até SPEC-3 maduro
- Backend / Supabase / RevenueCat — gated por validação de retention (D7 > 20%)
- Push notifications — micro-projeto separado (1 semana), pode rodar em paralelo

---

> **Geração**: 2026-05-19 · Sessão DLI-v2
> **Autor**: Auditoria multi-role via Claude Code (Opus 4.7)
> **Atualização**: à medida que specs forem executadas, marcar como `[DONE]` no header e fechar.
