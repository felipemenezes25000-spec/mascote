/**
 * Lógica pura do Mundo dos Sonhos (dream-flow) — testável sem UI.
 *
 * O anel de luz pulsa em ciclos lentos: expande na primeira metade do ciclo
 * até o pico (quando encosta no anel-alvo ao redor da lua) e contrai na
 * segunda metade. O acerto é SEMPRE medido contra o relógio da animação
 * (Date.now() - início do ciclo), nunca contra estado React — setState
 * atrasa e roubaria acertos legítimos no limite da janela.
 */

/** Duração de um ciclo completo (expande + contrai). Lento de propósito. */
export const DREAM_CYCLE_MS = 3200;

/** Rodadas por partida — uma chance de toque por ciclo. */
export const DREAM_ROUNDS = 8;

/** Fração do ciclo que conta como acerto, centrada no pico da expansão. */
export const DREAM_HIT_WINDOW_FRACTION = 0.22;

/**
 * O toque caiu na janela de acerto?
 *
 * O pico da expansão acontece na metade do ciclo (`cycleMs / 2`). A janela
 * cobre `windowFraction` do ciclo total, centrada nesse pico (metade antes,
 * metade depois), com bordas inclusivas. Tempo além de um ciclo é
 * normalizado por módulo — defende contra toque que chega entre o fim do
 * ciclo e o reset do relógio no JS thread.
 *
 * Entradas inválidas (NaN/Infinity/negativos/zero) nunca explodem: viram
 * erro de toque (`false`), que no jogo é só "tenta na próxima" — sem punição.
 */
export function isHit(
  elapsedInCycleMs: number,
  cycleMs: number,
  windowFraction: number,
): boolean {
  if (!Number.isFinite(elapsedInCycleMs) || elapsedInCycleMs < 0) return false;
  if (!Number.isFinite(cycleMs) || cycleMs <= 0) return false;
  if (!Number.isFinite(windowFraction) || windowFraction <= 0) return false;
  const fraction = Math.min(1, windowFraction);
  const withinCycle = elapsedInCycleMs % cycleMs;
  const peak = cycleMs / 2;
  const halfWindow = (fraction * cycleMs) / 2;
  return Math.abs(withinCycle - peak) <= halfWindow;
}

/**
 * Score normalizado 0..1 pro `completeMinigame`.
 * Clamp defensivo: rounds <= 0 ou NaN em qualquer entrada → 0.
 */
export function computeScore(hits: number, rounds: number): number {
  if (!Number.isFinite(hits) || !Number.isFinite(rounds) || rounds <= 0) return 0;
  return Math.max(0, Math.min(1, hits / rounds));
}
