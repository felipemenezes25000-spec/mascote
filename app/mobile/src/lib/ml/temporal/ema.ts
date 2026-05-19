/**
 * Exponentially-weighted moving average + Holt linear trend.
 *
 * Aplicação: smooth de séries temporais ruidosas (XP diário, vibe, count)
 * com responsividade ajustável (alpha).
 *
 * Holt: extensão do EMA que estima tendência (slope) também.
 */

export interface EmaState {
  level: number;
  trend: number;
  initialized: boolean;
}

export function createEma(): EmaState {
  return { level: 0, trend: 0, initialized: false };
}

/**
 * Holt linear: dado novo valor `y`, atualiza level + trend.
 * α (level smoothing) e β (trend smoothing) ∈ [0,1].
 */
export function emaUpdate(state: EmaState, y: number, alpha = 0.3, beta = 0.1): EmaState {
  if (!state.initialized) {
    return { level: y, trend: 0, initialized: true };
  }
  const newLevel = alpha * y + (1 - alpha) * (state.level + state.trend);
  const newTrend = beta * (newLevel - state.level) + (1 - beta) * state.trend;
  return { level: newLevel, trend: newTrend, initialized: true };
}

/** Aplica EMA sobre série inteira; retorna o state final. */
export function emaFit(series: number[], alpha = 0.3, beta = 0.1): EmaState {
  let s = createEma();
  for (const y of series) s = emaUpdate(s, y, alpha, beta);
  return s;
}

/** Forecast simples: level + h * trend (Holt). */
export function emaForecast(state: EmaState, horizon = 1): number {
  if (!state.initialized) return 0;
  return state.level + horizon * state.trend;
}

/** Slope normalizado [-1,+1] pra interpretar tendência facilmente. */
export function trendDirection(state: EmaState): 'up' | 'down' | 'flat' {
  /* v8 ignore next — state.initialized false só ocorre em série vazia
     (testado em via emaFit([]); manter guard pra usuários direto). */
  if (!state.initialized) return 'flat';
  const ratio = state.level !== 0 ? state.trend / Math.abs(state.level) : state.trend;
  if (ratio > 0.05) return 'up';
  if (ratio < -0.05) return 'down';
  return 'flat';
}
