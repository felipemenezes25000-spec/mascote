# Jornada de 100 Fases + Minigames — Design (2026-06-11)

## Visão

Transformar o Mascote num universo de progressão de longo prazo: **100 fases
em 10 mundos** + **minigames de autocuidado** + **Home com "quase lá"** —
gamificação profunda com psicologia ética (antecipação, coleção, microvitória),
sem culpa tóxica nem pay-to-win.

## Princípio central: fase = função pura do XP

A fase da jornada é derivada de `mascot.xp` (`journeyPhaseFromXp`), nunca um
contador paralelo. Herda de graça toda a blindagem auditada do pipeline de
check-in: cap diário de 150 XP, sanitização NaN, monotonicidade, locks.
O único estado novo é o **ponteiro de resgate** (`journey_claims`), que
garante idempotência do pagamento de recompensas.

## Os 10 mundos

| # | Mundo | Fases | XP/fase | Acumulado | Premium |
|---|-------|-------|---------|-----------|---------|
| 1 | Nascimento 🥚 | 1-10 | 10-50 | 270 | — |
| 2 | Rotina 💧 | 11-20 | 60 | 870 | — |
| 3 | Descoberta 🎨 | 21-30 | 100 | 1.870 | — |
| 4 | Constância 🔥 | 31-40 | 150 | 3.370 | — |
| 5 | Evolução ✨ | 41-50 | 220 | 5.570 | — |
| 6 | Amizade 💛 | 51-60 | 300 | 8.570 | — |
| 7 | Jornada 🗺️ | 61-70 | 400 | 12.570 | — |
| 8 | Maestria 🏆 | 71-80 | 550 | 18.070 | — |
| 9 | Forma Lendária 🌌 | 81-90 | 700 | 25.070 | Plus |
| 10 | Mascote Supremo 👑 | 91-100 | 900 | 34.070 | Plus |

Calibração: Mundo 1 completo em ~2-3 dias (gancho D1-D3); Fase 100 em ~8-12
meses de constância. Marcos visuais alinham: bebê (100 XP) ≈ f6, adolescente
(2.000) ≈ f31, adulto (8.000) ≈ f58, evoluído (25.000) ≈ f90.

## Recompensas — "só o que funciona de verdade"

Tipos claimáveis: `coins` | `gems` | `chest` (baú = coins+gem) | `title`
(fim de mundo, 10 títulos únicos) | `minigame` (unlock). Acessórios/cenários
NÃO são duplicados — o mapa da jornada apenas EXIBE os unlocks por level do
catálogo existente na fase correspondente (`catalogMilestones`), o closet
continua dono da regra.

## Premium ético (mundos 9-10)

- XP acumula pra todos; free vê as fases e progride.
- Resgate das recompensas de f81+ exige Plus; pendências ficam GUARDADAS
  (ponteiro não avança sobre fase bloqueada) → assinar resgata TUDO
  retroativamente. Sem perda, sem punição — só desejo.
- Paywall trigger novo: `journey_legendary`.

## Minigames

Registry com 3 implementados + 7 futuros (teaser textual "em breve", nunca
botão morto):

| Jogo | Tema | Unlock | Mecânica |
|------|------|--------|----------|
| ⚡ Corrida de Energia | energia | Fase 3 | tap nos itens bons, 30s |
| 💎 Caça aos Cristais | foco | Fase 8 | memória 3×4, pares |
| 🌙 Mundo dos Sonhos | descanso | Fase 15 | ritmo calmo, 8 rodadas |

Guard-rails: cap de partidas RECOMPENSADAS/dia (free 3, Plus 6 por jogo);
além do cap joga por diversão (explícito na UI, sem punição). XP via
`applyXp` dentro de `withLock('checkin:uid')` → respeita o cap global de
150 XP/dia e não cria atalho de progressão. Lógica de cada jogo é pura e
testada (`*-logic.ts`).

## Home

- `JourneyCard`: mundo + fase X/100 + barra + "quase lá" → /journey.
- `HomeActionRow`: Jogar · Cuidar · Conversar · Personalizar.
- `useJourneyClaim`: resgate no foco (idempotente) → confetti + toasts.

## IA

`identity.journey` (fase/mundo — conteúdo estático, não user-controlled)
injetado no system prompt v2: a IA menciona progresso "com orgulho leve,
nunca como cobrança".

## Notificações e analytics

- Kind novo `journey` (dedup 1/dia): "quase evoluindo" só quando progresso
  real ≥80%; baú esperando; mundo completo.
- Eventos novos: `journey_phase_reached`, `journey_reward_claimed`,
  `journey_map_viewed`, `minigame_started`, `minigame_completed`,
  `mystery_box_opened`, `daily_reward_claimed`.

## Invariantes de teste (tests/game/journey.test.ts + minigames.test.ts)

- 100 fases, thresholds estritamente crescentes, toda fase tem recompensa.
- Claim idempotente sob concorrência; ponteiro nunca regride.
- Free não resgata mundo 9+; resgate retroativo ao assinar verificado.
- Cap diário de minigame por jogo; conclusões paralelas não duplicam.
- XP de minigame nunca fura o cap global.
