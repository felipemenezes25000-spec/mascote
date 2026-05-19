/**
 * Behavior Engine — seletor utility AI.
 *
 * Algoritmo:
 *   1. Filtra behaviors em cooldown
 *   2. Computa score(ctx) pra cada elegível
 *   3. Seleciona MAIOR score (tie: first wins, ordem estável)
 *   4. Retorna BehaviorSelection (caller decide executar e atualizar cooldown)
 *
 * Engine é PURA — não modifica state. Cooldown tracking é responsabilidade
 * do caller (geralmente um React hook que mantém `lastRanAt: Map`).
 */

import type {
  Behavior,
  BehaviorContext,
  BehaviorEffect,
  BehaviorSelection,
} from './types';

/**
 * Avalia todos behaviors e retorna o de maior score.
 *
 * @param behaviors Lista de behaviors elegíveis. Engine não filtra cooldown
 *                  internamente — caller passa só os elegíveis.
 * @param ctx       Contexto do tick.
 */
export function selectBehavior(
  behaviors: readonly Behavior[],
  ctx: BehaviorContext,
): BehaviorSelection {
  const scoresById: Record<string, number> = {};
  let best: Behavior | null = null;
  let bestScore = 0;
  for (const b of behaviors) {
    // Skip behaviors em cooldown ativo
    if (ctx.cooldownActive.has(b.id)) {
      scoresById[b.id] = 0;
      continue;
    }
    const raw = b.score(ctx);
    // Sanitiza: NaN/Infinity/negative → 0
    const safe = Number.isFinite(raw) && raw > 0 ? Math.min(1, raw) : 0;
    scoresById[b.id] = safe;
    if (safe > bestScore) {
      bestScore = safe;
      best = b;
    }
  }
  return { behavior: best, score: bestScore, scoresById };
}

/**
 * Executa o behavior selecionado retornando seus efeitos. Wrapper trivial —
 * existe pra dar uma fronteira clara entre seleção e execução (facilita teste
 * de cada lado isolado).
 */
export function executeBehavior(
  behavior: Behavior,
  ctx: BehaviorContext,
): BehaviorEffect {
  return behavior.execute(ctx);
}

/**
 * Helper: computa quais behaviors estão em cooldown dado `lastRanAt`.
 * Útil pro caller construir `ctx.cooldownActive`.
 */
export function computeCooldownSet(
  behaviors: readonly Behavior[],
  lastRanAt: ReadonlyMap<string, number>,
  nowMs: number = Date.now(),
): Set<string> {
  const out = new Set<string>();
  for (const b of behaviors) {
    const last = lastRanAt.get(b.id);
    if (typeof last !== 'number') continue;
    const elapsed = (nowMs - last) / 1000;
    if (elapsed < b.cooldownSeconds) {
      out.add(b.id);
    }
  }
  return out;
}
