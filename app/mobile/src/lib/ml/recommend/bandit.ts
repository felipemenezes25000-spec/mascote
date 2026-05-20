/**
 * Multi-armed bandit pra escolha de missão diária.
 *
 * Estratégia: Thompson Sampling (Bayesian) — melhor que epsilon-greedy
 * em pouca amostra. Cada arm = template de missão; reward = 1 se user
 * completa, 0 senão. Beta-Bernoulli conjugate prior.
 *
 * Vantagem sobre `pickDailyMission` determinístico: a IA aprende QUAIS
 * missões funcionam pro user específico e otimiza ao longo do tempo,
 * mantendo exploração (ocasionalmente sugere uma "nova").
 */

export interface BanditArm {
  /** ID do arm (e.g. mission template id). */
  id: string;
  /** α = sucessos + 1 (Beta prior). */
  alpha: number;
  /** β = falhas + 1 (Beta prior). */
  beta: number;
  /** Total de vezes que o arm foi escolhido. */
  pulls: number;
}

export interface BanditState {
  arms: Map<string, BanditArm>;
}

export function createBandit(): BanditState {
  return { arms: new Map() };
}

function ensureArm(state: BanditState, id: string): BanditArm {
  let arm = state.arms.get(id);
  if (!arm) {
    arm = { id, alpha: 1, beta: 1, pulls: 0 };
    state.arms.set(id, arm);
  }
  return arm;
}

/**
 * Amostra de Beta(α, β) via método de Marsaglia (Gamma sampling).
 * Fast enough pra ≤100 arms por chamada.
 */
function gammaSample(k: number, rng: () => number): number {
  // Marsaglia & Tsang método (k ≥ 1). Pra k < 1 usa boost trick.
  if (k < 1) {
    const u = rng();
    return gammaSample(k + 1, rng) * Math.pow(u, 1 / k);
  }
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do {
      // box-muller pra normal padrão
      const u1 = Math.max(rng(), 1e-10);
      const u2 = rng();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function betaSample(alpha: number, beta: number, rng: () => number = Math.random): number {
  const x = gammaSample(alpha, rng);
  const y = gammaSample(beta, rng);
  const denom = x + y;
  // Guard: x+y=0 (raríssimo) ou NaN/Infinity caem aqui — devolve 0.5 neutro
  // em vez de NaN/Infinity que viraria veneno em selectArm.
  if (!Number.isFinite(denom) || denom <= 0) return 0.5;
  const v = x / denom;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Escolhe um arm via Thompson Sampling: amostra de cada Beta e pega o maior.
 * Se `candidateIds` for passado, limita escolha a esse subset (pra contexto).
 */
export function selectArm(
  state: BanditState,
  candidateIds: string[],
  rng: () => number = Math.random
): string | null {
  if (candidateIds.length === 0) return null;
  let best: { id: string; sample: number } | null = null;
  for (const id of candidateIds) {
    const arm = ensureArm(state, id);
    const sample = betaSample(arm.alpha, arm.beta, rng);
    if (!best || sample > best.sample) best = { id, sample };
  }
  /* v8 ignore start — `best` é sempre setado no primeiro candidate quando há
     1+; o early-return acima já trata candidateIds vazio. Esses dois branches
     defensivos protegem contra reescrita futura. */
  if (best) {
    const arm = state.arms.get(best.id)!;
    arm.pulls += 1;
  }
  return best?.id ?? null;
  /* v8 ignore stop */
}

/** Registra reward (1 = sucesso, 0 = falha) pra um arm.
 *
 * Aceita qualquer valor em [0, 1] e usa fracional como peso entre α e β.
 * Valores fora desse range (negativos, NaN, > 1) são ignorados — type signature
 * é `0 | 1` mas em runtime payload corrompido via deserialize pode vazar.
 */
export function recordReward(state: BanditState, armId: string, reward: 0 | 1 | number): void {
  if (!Number.isFinite(reward)) return;
  const clamped = Math.max(0, Math.min(1, reward));
  const arm = ensureArm(state, armId);
  arm.alpha += clamped;
  arm.beta += 1 - clamped;
}

/** Probabilidade estimada de sucesso (média da Beta). */
export function estimatedRate(arm: BanditArm): number {
  return arm.alpha / (arm.alpha + arm.beta);
}

/** Top N arms por taxa estimada (debug / leaderboard). */
export function topArms(
  state: BanditState,
  n = 5
): Array<{ id: string; rate: number; pulls: number }> {
  const arr = Array.from(state.arms.values()).map(a => ({
    id: a.id,
    rate: estimatedRate(a),
    pulls: a.pulls,
  }));
  arr.sort((a, b) => b.rate - a.rate);
  return arr.slice(0, n);
}

export function serializeBandit(state: BanditState): string {
  return JSON.stringify({ arms: Array.from(state.arms.entries()) });
}

export function deserializeBandit(raw: string): BanditState {
  try {
    const p = JSON.parse(raw);
    const arms = new Map<string, BanditArm>();
    if (Array.isArray(p?.arms)) {
      for (const entry of p.arms) {
        if (!Array.isArray(entry) || entry.length !== 2) continue;
        const [id, value] = entry as [unknown, unknown];
        if (typeof id !== 'string' || !value || typeof value !== 'object') continue;
        const v = value as Partial<BanditArm>;
        // Payload corrompido (alpha/beta undefined) produziria NaN em
        // estimatedRate e quebraria selectArm. Sanitiza com Beta(1,1) prior.
        const alpha = Number.isFinite(v.alpha) && (v.alpha as number) > 0 ? (v.alpha as number) : 1;
        const beta = Number.isFinite(v.beta) && (v.beta as number) > 0 ? (v.beta as number) : 1;
        const pulls = Number.isFinite(v.pulls) && (v.pulls as number) >= 0 ? Math.floor(v.pulls as number) : 0;
        arms.set(id, { id, alpha, beta, pulls });
      }
    }
    return { arms };
  } catch {
    return createBandit();
  }
}
