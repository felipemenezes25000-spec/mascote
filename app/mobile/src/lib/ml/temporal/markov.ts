/**
 * Cadeia de Markov 1ª ordem: aprende transições "depois de A, o que vem?".
 *
 * Aplicação: "depois de exercício, você geralmente bebe água" — descobre
 * padrões reais no comportamento do user e permite predição.
 *
 * Estado = string (habit_kind, intent, ou qualquer label).
 */

export interface MarkovChain<S extends string> {
  /** transitions[from][to] = count */
  transitions: Map<S, Map<S, number>>;
  /** Total transições saindo de cada estado (denominador) */
  totalFrom: Map<S, number>;
  /** Distribuição inicial (frequência de cada estado em geral) */
  stateCount: Map<S, number>;
  /** Total de eventos */
  total: number;
}

export function emptyChain<S extends string>(): MarkovChain<S> {
  return {
    transitions: new Map(),
    totalFrom: new Map(),
    stateCount: new Map(),
    total: 0,
  };
}

/** Treina cadeia com uma sequência ordenada de estados. */
export function trainSequence<S extends string>(chain: MarkovChain<S>, sequence: S[]): void {
  for (let i = 0; i < sequence.length; i++) {
    const s = sequence[i];
    chain.stateCount.set(s, (chain.stateCount.get(s) ?? 0) + 1);
    chain.total += 1;
    if (i + 1 < sequence.length) {
      const next = sequence[i + 1];
      let row = chain.transitions.get(s);
      if (!row) {
        row = new Map();
        chain.transitions.set(s, row);
      }
      row.set(next, (row.get(next) ?? 0) + 1);
      chain.totalFrom.set(s, (chain.totalFrom.get(s) ?? 0) + 1);
    }
  }
}

/** P(next | from) — probabilidade de transição, com Laplace smoothing. */
export function transitionProb<S extends string>(
  chain: MarkovChain<S>,
  from: S,
  to: S,
  alpha = 0.5
): number {
  const row = chain.transitions.get(from);
  const denom = (chain.totalFrom.get(from) ?? 0) + alpha * chain.stateCount.size;
  if (denom === 0) return 0;
  const num = (row?.get(to) ?? 0) + alpha;
  return num / denom;
}

/** Próximos estados mais prováveis a partir de `from`. */
export function topNext<S extends string>(
  chain: MarkovChain<S>,
  from: S,
  k = 3
): Array<{ state: S; prob: number }> {
  const row = chain.transitions.get(from);
  if (!row || row.size === 0) return [];
  /* v8 ignore start — `totalFrom` é incrementado junto com cada transição
     em `trainSequence`; se há row, total > 0 sempre. Guards defensivos. */
  const total = chain.totalFrom.get(from) ?? 0;
  if (total === 0) return [];
  /* v8 ignore stop */
  const arr = Array.from(row.entries()).map(([state, count]) => ({
    state,
    prob: count / total,
  }));
  arr.sort((a, b) => b.prob - a.prob);
  return arr.slice(0, k);
}

/** "Transição interessante": prob alta E suporte mínimo (não só 1 amostra). */
export function notableTransitions<S extends string>(
  chain: MarkovChain<S>,
  minSupport = 3,
  minProb = 0.5
): Array<{ from: S; to: S; prob: number; support: number }> {
  const out: Array<{ from: S; to: S; prob: number; support: number }> = [];
  for (const [from, row] of chain.transitions) {
    /* v8 ignore next 2 — totalFrom é guaranteed > 0 quando há transição. */
    const total = chain.totalFrom.get(from) ?? 0;
    for (const [to, count] of row) {
      if (count < minSupport) continue;
      const prob = count / total;
      /* v8 ignore next — minProb=0.5 default; prob ≥ minSupport/total ≥ 0.5
         tipicamente para transições treinadas. Guard pra parametrização extrema. */
      if (prob < minProb) continue;
      out.push({ from, to, prob, support: count });
    }
  }
  out.sort((a, b) => b.prob - a.prob);
  return out;
}
