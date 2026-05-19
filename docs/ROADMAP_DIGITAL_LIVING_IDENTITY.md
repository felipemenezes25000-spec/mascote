# Roadmap — Digital Living Identity (DLI)

> Visão: criatura digital procedural, viva, única por usuário, em evolução
> contínua e adaptada a hábitos + emoção. Multi-trimestre.

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

### 🔴 Bloqueador da identidade "Digital Living Identity"

#### DLI-1 — Evolution screen ainda é linear (Ovo→Bebê→Criança→Adolescente→Adulto)
- **Estado atual**: tela `/evolution` mostra XP thresholds fixos (0, 100, 500, 2000, 8000, 25000).
- **Brief contradiz explicitamente**: *"A evolução NÃO deve ser: bebê > criança > adulto. Isso é ultrapassado."*
- **Substituir por**: viewer procedural — visualizar os 11 genes ativos, deltas
  recentes, mutações desbloqueadas, traits emergentes. Linha-de-tempo das
  mudanças biológicas em vez de barras de XP.
- **Esforço**: 3-5 dias (UI + novos componentes + integração com `stories.ts`).
- **Dependência**: `dominantChange` já existe, narrativa já existe.

#### DLI-2 — Mascot3D é estático (não responde a mood/contexto)
- **Estado atual**: corpo procedural renderiza, mas é parado. Não pisca, não respira, não acompanha o toque.
- **Falta**:
  - **Idle animations** (respiração: scale 1.0↔1.02 ciclando, eye blink 3-6s aleatório)
  - **Eye tracking** ao toque (PanResponder já capturado em Mascot3D.tsx:48 — falta aplicar no shader/material dos olhos)
  - **Mood-driven posture** (sleep mood → cabeça caída; empolgado → bounce sutil)
  - **Microexpressões** (sobrancelhas/boca contextualizadas)
- **Esforço**: 7-10 dias.
- **Dependência**: nenhuma — base R3F está montada.

#### DLI-3 — Sem evolução morfológica contínua (Spore-like)
- **Estado atual**: morfologia é determinística do genoma (mesmo input → mesma forma). Não cresce membros novos, não muta organicamente.
- **Falta**:
  - **Sistema de mutations** — desbloqueios condicionais (30 dias de exercise → membros mais musculosos; 60 dias de creativity habits → padrões abstratos no corpo)
  - **Morph targets** com interpolação suave (não trocar de modelo, e sim *blend shapes*)
  - **Procedural appendages** (antenas, espinhos, cauda já estruturados em morphology.ts mas ainda não renderizados pelo Mascot3D)
- **Esforço**: 3-4 semanas (system + UI + invariantes de testes).
- **Dependência**: DLI-2 (animation pipeline) é pré-requisito.

---

### 🟡 Vínculo emocional avançado

#### DLI-4 — Memória emocional ainda é recall simples
- **Estado atual**: `recall(userId, msg, 3)` retorna até 3 memórias por relevância semântica (embeddings locais ou OpenAI).
- **Falta**:
  - **Memory graph** — relacionar eventos (recaída ↔ insight ↔ vitória) em vez de embeddings flat
  - **Importance scoring** — uma frase marcante pesa mais que uma trivial
  - **Decay temporal** — memórias antigas perdem peso, frescas dominam
  - **Eventos marcantes** auto-detectados (primeiro check-in, streak 7d, primeira menção de algo)
- **Esforço**: 2-3 semanas.
- **Dependência**: nenhuma; sistema de memory atual é base.

#### DLI-5 — Personalidade da IA é fixa, não evolui
- **Estado atual**: tom é determinado pelo preset (calmo, motivador, fofo, sábio). Mock replies são pools estáticos.
- **Falta**:
  - **Tom adaptado pelo DNA** (não pelo preset) — usuário que carregou socialEnergy alto → mascote fala mais expansivo, mesmo sendo "Calmo"
  - **Hour/weather awareness** — "boa noite, Felipe" às 22h vs "bom dia" às 7h
  - **Frequência de uso awareness** — "fazia 2 dias que você não aparecia"
- **Esforço**: 1 semana (refatorar `replies.ts` + `ai.ts` system prompt).
- **Dependência**: nenhuma.

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

#### DLI-7 — Voz procedural do mascote
- **Estado atual**: zero áudio.
- **Falta**: micro-vocalizações tipo Sims/Animal Crossing — tom modulado pelo DNA (socialEnergy alto → notas brilhantes; emotionalDepth alto → modulação variada). TTS na chat reply é nice-to-have.
- **Esforço**: 2 semanas (gerar com Web Audio API + tone.js, ou pre-compor 20 ruídos modulados).

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

#### DLI-11 — Behavior trees / utility AI proper
- **Estado atual**: heurística simples (mood label, drift, decay). Sem behavior tree.
- **Falta**: graph de comportamentos contextuais (toque → reação; ausência prolongada → estado de espera; vitória → celebração).
- **Esforço**: 3-4 semanas (precisa pré-requisitos DLI-2/3).

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
