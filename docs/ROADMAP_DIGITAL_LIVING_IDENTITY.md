# Roadmap — Digital Living Identity (DLI)

> Visão: criatura digital procedural, viva, única por usuário, em evolução
> contínua e adaptada a hábitos + emoção. Multi-trimestre.
>
> **Atualização 2026-05-19 (DLI-v3)**: 5/5 SPECs entregues. Todos os bloqueadores
> da identidade DLI estão satisfeitos. Próximas fases viram trabalho de infra
> (backend, push, billing) e refinamento (voz, shaders, memory graph).

Documento honesto: separa o que **já está construído** do que **falta**, com
estimativas de esforço e dependências. Atualizar à medida que se executa.

---

## Estado atual (já funciona ponta-a-ponta — validado via Playwright 2026-05-19)

| Sistema | Status | Onde mora |
|---|---|---|
| Genoma de 11 traits ([0.02, 0.98], determinístico via mulberry32) | ✅ | [src/lib/dna/genome.ts](app/mobile/src/lib/dna/genome.ts) |
| Variação procedural por seed do user_id (criaturas únicas no MESMO preset) | ✅ | `genomeFromPreset` + FNV-1a hash do uid |
| 4 personalidades-preset (Calmo, Motivador, Fofo, Sábio) com bias gênico | ✅ | [src/lib/dna/personalities.ts](app/mobile/src/lib/dna/personalities.ts) |
| Drift de hábitos → genes (9 hábitos × 11 genes, sempre não-negativo) | ✅ | [src/lib/dna/habitToGene.ts](app/mobile/src/lib/dna/habitToGene.ts) |
| Decay temporal não-punitivo (nunca atravessa 0.5) | ✅ (corrigido nesta sessão) | `applyDecay` |
| Renderer 3D (R3F + three.js, body procedural icosahedron + olhos + paleta DNA-driven) | ✅ | [src/components/Mascot3D.tsx](app/mobile/src/components/Mascot3D.tsx) |
| Fallback 2D para devices fracos (deviceCapabilities heurística) | ✅ | [src/lib/deviceCapabilities.ts](app/mobile/src/lib/deviceCapabilities.ts) |
| Paleta + morphology + mood derivados do genoma | ✅ | `palette.ts`, `morphology.ts`, `mood.ts` |
| Narrativa procedural ("Bipo ganhou olhar mais atento") | ✅ | [src/lib/dna/stories.ts](app/mobile/src/lib/dna/stories.ts) |
| Persistência local AsyncStorage + migrations versionadas (DNA é v2) | ✅ | [src/lib/db.ts](app/mobile/src/lib/db.ts) |
| IA com mock + OpenAI BYOK + memory recall (até 3 memórias relevantes) | ✅ | [src/lib/ai.ts](app/mobile/src/lib/ai.ts) |
| Safety ensemble: critical → CRISIS, high → CRISIS, watch → DIAGNOSIS_REDIRECT | ✅ (ampliado nesta sessão) | `safety.ts` + `ml/safety/classifier.ts` |
| Attachment classifier (te amo, você é minha única amiga, etc.) | ✅ | `detectAttachment` |
| Check-in lock per-user (anti-double-spend de taps paralelos) | ✅ | `withLock` em `db.ts` |
| XP/coins/streak/missions/daily-reward/combo/mystery-box | ✅ | `lib/db.ts` |
| Onboarding 6 telas (welcome → age → goal+mood → mascot+meet → name → notice+push) | ✅ | `app/onboarding/*` |
| 4 tabs principais (Home / Chat / Evolution / Report) | ✅ | `app/(tabs)/*` |
| Tour onboarding pós-criação (4 passos) | ✅ | UI tour |
| 1509 testes passando + typecheck limpo + cobertura 98%+ | ✅ | `npm test` |

**Cerne do DLI já operacional**: signup → DNA único gerado a partir de personalidade
+ seed FNV(uid) → render 3D com paleta/forma derivada → drift contínuo via
check-in → narrativa procedural. **Mais perto da visão do que parece**.

---

## Gaps vs. visão (priorizados)

### ✅ Bloqueadores da identidade "Digital Living Identity" — TODOS RESOLVIDOS

#### DLI-1 — Evolution screen procedural ✅ ENTREGUE (DLI-v2)
- ✅ `phaseList` linear removido da UI principal
- ✅ Timeline biológica das transformações
- ✅ Viewer de genoma colapsível (11 traits)
- ✅ Próximo marco preview
- ✅ Card de identidade procedural (descritores + traits)
- **Onde**: [`app/(tabs)/evolution.tsx`](../app/mobile/app/(tabs)/evolution.tsx)

#### DLI-2 — Mascot3D animations ✅ ENTREGUE (DLI-v2/v3)
- ✅ Breath cycle (DNA-driven freq via morph.breathFreq)
- ✅ Blink aleatório a cada 3-6s
- ✅ Eye tracking via PanResponder + lerp na pupila
- ✅ Mood-driven posture (5 moods, lerp suave)
- ✅ **Boca expressiva** (TorusGeometry parcial, 5 mood states)
- ✅ **Aura mood-reactive** (radius/speed/opacity escalam)
- ✅ **Sparkle burst** condicional (mood='empolgado')
- ✅ Bounce-on-tap
- ✅ Mascot3D imperative actions (bounce/celebrate/wander/rest/observe)
- **Onde**: [`src/components/Mascot3D.tsx`](../app/mobile/src/components/Mascot3D.tsx)

#### DLI-3 — Evolução morfológica contínua ✅ ENTREGUE (DLI-v2)
- ✅ Sistema de **7 mutations** com 4 raridades (incl. lendária)
- ✅ Mutations persistentes em AsyncStorage (migration v3, table `dna_mutations`)
- ✅ Condições compostas: gene>X + habit count + streak + days since created
- ✅ Visual impact (morphology multipliers + glow boost + particles + patterns)
- ✅ Avaliação no pipeline de check-in (`applyCheckinFully`)
- ✅ Tela `/mutations` com catálogo agrupado por raridade + lock state
- ✅ Toast distinto por raridade no desbloqueio
- ⚠️ **Falta**: shader real de patterns (fractal/spots/stripes) — placeholder. ~1 sem.
- **Onde**: [`src/lib/dna/mutations.ts`](../app/mobile/src/lib/dna/mutations.ts), `/mutations.tsx`

---

### 🟡 Vínculo emocional avançado

#### DLI-4 — Memory Graph ✅ ENTREGUE (DLI-v5)
- ✅ `src/lib/memory/graph.ts` com edges typed: `precededBy` (temporal, <24h) e `relatedTo` (Jaccard keyword overlap ≥ 2)
- ✅ `buildGraph(memories)` puro, idempotente — O(n²) aceitable pra cap 200
- ✅ `getRelated(graph, memId, opts)` com filtros por kind/limit/minWeight
- ✅ `rerankByGraph(items, graph, seedIds, boostFactor)` integrado em `recall()` — top-3 hits viram seeds; itens conectados ganham boost
- ✅ `centrality(graph, memId)` + `graphStats(graph)` pra debug/telemetria local
- ✅ 26 testes em `tests/lib/memory/graph.test.ts` (Jaccard, temporal, simetria, determinismo, idempotência)
- ⚠️ **Resta**: `similar` (cosine entre embeddings) e `contrasts` (sentiment polar oposto). Importance scoring de "eventos marcantes". ~1 sem.
- **Onde**: [`src/lib/memory/graph.ts`](../app/mobile/src/lib/memory/graph.ts), integrado em [`src/lib/memory.ts`](../app/mobile/src/lib/memory.ts) recall path

#### DLI-5 — Personalidade da IA ✅ ENTREGUE (DLI-v2)
- ✅ Descritores semânticos seguros derivados do DNA (`dnaDescriptors`, `dnaPromptSection`)
- ✅ Injeção em system prompt — IA "vê" a criatura sem expor gene cru
- ✅ Garantido por 7 testes em `tests/security/dna-privacy-ai.test.ts` — fetch interceptado, payload validado
- ⚠️ **Resta**: hour-of-day awareness, freq awareness, mood trend awareness em copy. ~3 dias.
- **Onde**: [`src/lib/dna/descriptors.ts`](../app/mobile/src/lib/dna/descriptors.ts), [`src/lib/ai.ts`](../app/mobile/src/lib/ai.ts)

#### DLI-6 — Ambient ainda não reage ao estado
- **Estado atual**: `SceneBackground` tem variantes por scene_id, mas não muda dinâmicamente.
- **Falta**:
  - **Time-of-day shading** (manhã azul→pôr-do-sol laranja→noite roxa)
  - **Weather-driven particles** (chuva, raios de sol)
  - **Mood-driven hue shift** (mascote triste → ambiente mais frio)
  - **Streak milestone fireworks** (efeito visual quando bate 7/30/90 dias)
- **Esforço**: 2 semanas.

---

### 🟢 Polimento e narrativa

#### DLI-7 — Voz procedural ✅ ENTREGUE (DLI-v5)
- ✅ `src/lib/voice/` (4 arquivos: types, profile, player, index)
- ✅ `voiceProfileFromGenome(g)` — perfil DNA-driven (baseFreq 140-380Hz, vibrato 0-0.9, brightness, decay 0.08-0.45s, scale variando entre maior pentatônica / blues / dissonante, syllables 2-5, noteSpacing)
- ✅ `playVoiceLine(profile, line)` — Web Audio API direto (OscillatorNode + LFO vibrato + gain envelope ADSR-lite). Volume cap 0.2 (ambient, não invasivo)
- ✅ Modificadores por `kind`: greet/react/curious/sleepy/celebrate/attention
- ✅ Native (RN nativo): no-op gracioso — não crasha, dispatcher é silencioso até wire-up via expo-av (próximo)
- ✅ Disparado em: tap no Mascot da Home (kind='react') + mutation unlock (kind='celebrate', intensity escala com raridade)
- ✅ 28 testes (`tests/lib/voice/`) — determinismo, ranges, escala correta por DNA, mock backend
- ⚠️ **Resta**: wire-up nativo via expo-av com tone-bank pré-gerado por personalidade. ~3 dias.
- **Onde**: [`src/lib/voice/`](../app/mobile/src/lib/voice/)

#### DLI-8 — Customização visual deliberada (sem perder a procedural)
- **Estado atual**: `app/closet` existe mas é skin de acessórios (boné, óculos).
- **Falta**: morph sliders pra usuário inflar/desinflar traits específicos do DNA — mas com cap (não dá pra zerar empathy de uma criatura que cresceu com isso; pode só "aumentar 0.05 a creativity").
- **Esforço**: 2 semanas + balance design.

#### DLI-9 — Forma rara desbloqueável
- **Estado atual**: phase "Forma Rara" listada na evolution screen mas sem trigger ou render diferente.
- **Falta**: condições de desbloqueio (90+ dias de consistência + variedade de hábitos + drift pra extremo em algum gene) → variação visual rara (bioluminescência, padrão particular).
- **Esforço**: 1 semana (após DLI-3).

---

### 🔵 Infra técnica

#### DLI-10 — Sync remoto opcional (multi-device + backup)
- **Estado atual**: 100% local AsyncStorage. Reinstalar app perde tudo.
- **Falta**: Supabase opt-in com encryption-at-rest. DNA NUNCA sai do device sem opt-in explícito.
- **Esforço**: 2 semanas.

#### DLI-11 — Behavior Engine ✅ ENTREGUE (DLI-v2/v3)
- ✅ Scaffold em `src/lib/behavior/` (types, engine, behaviors, hook)
- ✅ 6 behaviors: idle.breath, reactive.return, milestone.streak_7,
  temporal.quiet_observation, **dna.social_burst** (DNA-driven),
  **dna.quiet_contemplation** (DNA-driven)
- ✅ Utility AI selector (`selectBehavior`) — score, cooldown, tie-break
- ✅ `useBehaviorTick` hook integrado no Home (tick 30s)
- ✅ Mascot3D imperative actions (bounce/celebrate/wander/rest/observe)
- ⚠️ **Resta**: 3-5 behaviors adicionais (reaction to touch, reaction to habit-streak,
  contextual greeting). ~1 sem.
- **Onde**: [`src/lib/behavior/`](../app/mobile/src/lib/behavior/)

---

## Sequência sugerida (6 meses)

```
Mês 1     ▸ DLI-2 (animation pipeline)         ◀ unlocks DLI-3
Mês 2-3   ▸ DLI-3 (morphological evolution)
Mês 2     ▸ DLI-1 (evolution screen rewrite)   (parallel track)
Mês 3-4   ▸ DLI-4 (memory graph)
Mês 4     ▸ DLI-5 (adaptive personality tone)
Mês 5     ▸ DLI-6 (ambient reactive)
Mês 5-6   ▸ DLI-7 (voice) + DLI-8 (customization)
Mês 6     ▸ DLI-9 (rare form) + DLI-11 (behavior tree)
Backlog   ▸ DLI-10 (sync remoto — quando houver retenção comprovada)
```

---

## NÃO fazer

- **Unity / Unreal embedding** — não vale o custo de complexidade pra 99% dos casos de criatura mobile. R3F + three.js já entrega. Considerar Unity SÓ se DLI-3 exigir físicas de cloth/fluid que three.js não cobre razoavelmente.
- **Fases lineares "raro/épico/lendário"** — proibido pelo brief. Evolução é contínua.
- **Diagnóstico ou tom clínico** — positioning é wellness-only ([feedback_mascote_positioning](app/mobile/src/content/safety.ts)). Mantido em todos os pivots.
- **Vínculo tóxico / dependência emocional** — attachment classifier ATIVO ([src/content/safety.ts:93-108](app/mobile/src/content/safety.ts)). Não regressar.

---

## Validação por sessão de Playwright (2026-05-19)

- ✅ Welcome → Signup → Onboarding (6 screens) → Home: fluxo limpo, 0 erros console
- ✅ DNA gerado: 11 genes válidos em [0.02, 0.98], com variação por seed do uid
- ✅ Mascot3D renderiza: canvas 224×224 WebGL2, 33.7% pixels coloridos, paleta lilás coerente com Calmo
- ✅ Check-in de água: +19 XP, +5 coins, drift correto em resilience/adaptability
- ✅ Chat IA mock: resposta calma "Tá tudo no seu tempo aqui."
- ✅ Crisis classifier: "quero me matar" → CRISIS_REPLY com CVV 188 + SAMU
- ✅ Diagnosis redirect (após fix): "tenho depressão" → DIAGNOSIS_REDIRECT
- ✅ High distress (após fix): "estou com pânico" → CRISIS_REPLY
- ✅ Responsividade: 375×812 (mobile) e 1280×800 (desktop) sem overflow

### Bugs achados e fixados nesta sessão

| ID | Severidade | Descrição | Arquivo |
|---|---|---|---|
| #17 | P0 | Regex diagnostic em ai.ts perdia "tenho depressão" | `src/lib/ai.ts` |
| #20 | P0 | input flag=high não tinha handler → caía pra mock | `src/lib/ai.ts` |
| #16 | P1 | Require cycle dna/index.ts ↔ dna/stories.ts | `src/lib/dna/stories.ts` |
| #14 | P2 | onboarding/name re-pedia display_name do signup | `app/onboarding/*` |

### Bugs/gaps ainda abertos (não-bloqueantes pra MVP)

- #18 (P1): Evolution screen com fases lineares → **DLI-1** acima
- #19 (P2): Message rows não persistem `source` (mock|openai|fallback) — quick fix
- #15 (P3): `pointerEvents` deprecation warning vem de lib externa (expo-router) — esperar upstream
