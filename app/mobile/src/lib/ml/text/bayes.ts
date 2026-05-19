/**
 * Naive Bayes multinomial com Laplace smoothing — online learning.
 *
 * Cada `learn(text, label)` atualiza contagens, e `predict(text)` retorna
 * a label mais provável + confiança.
 *
 * Por que online: o user usa expressões particulares ("tô na pista") que
 * regex genérica nunca pegaria. Bayes aprende com cada exemplo.
 *
 * P(class | doc) ∝ P(class) * Π P(token | class)
 * P(token | class) = (count(token, class) + α) / (sum(count, class) + α * |V|)
 */

import { tokenize } from './tokenize';

export interface BayesModel<L extends string> {
  /** count(label) — quantas vezes cada label apareceu */
  labelCount: Map<L, number>;
  /** count(token, label) — quantas vezes token apareceu em docs daquela label */
  tokenLabelCount: Map<L, Map<string, number>>;
  /** sum(count(token, label)) — total de tokens em docs daquela label */
  totalTokensPerLabel: Map<L, number>;
  /** Vocabulário global */
  vocabulary: Set<string>;
  /** Total de documentos treinados */
  totalDocs: number;
  /** Hiperparam de smoothing (Laplace) */
  alpha: number;
}

export function createBayes<L extends string>(alpha = 1): BayesModel<L> {
  return {
    labelCount: new Map(),
    tokenLabelCount: new Map(),
    totalTokensPerLabel: new Map(),
    vocabulary: new Set(),
    totalDocs: 0,
    alpha,
  };
}

export function learn<L extends string>(model: BayesModel<L>, text: string, label: L): void {
  const tokens = tokenize(text);
  if (tokens.length === 0) return;
  model.totalDocs += 1;
  model.labelCount.set(label, (model.labelCount.get(label) ?? 0) + 1);
  let tokenMap = model.tokenLabelCount.get(label);
  if (!tokenMap) {
    tokenMap = new Map();
    model.tokenLabelCount.set(label, tokenMap);
  }
  for (const t of tokens) {
    tokenMap.set(t, (tokenMap.get(t) ?? 0) + 1);
    model.vocabulary.add(t);
  }
  model.totalTokensPerLabel.set(
    label,
    (model.totalTokensPerLabel.get(label) ?? 0) + tokens.length
  );
}

export interface BayesPrediction<L extends string> {
  label: L;
  /** Probabilidade normalizada [0,1] */
  confidence: number;
  /** Todas as log-probs por label (debug/threshold) */
  scores: Map<L, number>;
}

export function predict<L extends string>(
  model: BayesModel<L>,
  text: string
): BayesPrediction<L> | null {
  if (model.totalDocs === 0 || model.labelCount.size === 0) return null;
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;
  const V = model.vocabulary.size;
  const alpha = model.alpha;

  const logScores = new Map<L, number>();
  for (const [label, labelN] of model.labelCount) {
    /* v8 ignore start — labelCount, tokenLabelCount e totalTokensPerLabel
       são mantidos sincronizados por `learn`; estes fallbacks são guards. */
    const tokenMap = model.tokenLabelCount.get(label) ?? new Map<string, number>();
    const totalTokens = model.totalTokensPerLabel.get(label) ?? 0;
    /* v8 ignore stop */
    // prior log P(class)
    let logProb = Math.log(labelN / model.totalDocs);
    // likelihood
    for (const t of tokens) {
      const tc = tokenMap.get(t) ?? 0;
      const p = (tc + alpha) / (totalTokens + alpha * V);
      logProb += Math.log(p);
    }
    logScores.set(label, logProb);
  }

  // Softmax pra normalizar em [0,1]
  let max = -Infinity;
  for (const v of logScores.values()) if (v > max) max = v;
  // Guard contra underflow extremo: se TODAS as labels têm logProb = -Infinity
  // (doc com tokens ultra-raros em label grande), `v - max = -Inf - (-Inf) = NaN`.
  // Fallback: retorna a primeira label com confiança uniforme (prior).
  if (!Number.isFinite(max)) {
    const firstLabel = logScores.keys().next().value as L | undefined;
    if (!firstLabel) return null;
    const uniform = 1 / logScores.size;
    return { label: firstLabel, confidence: uniform, scores: logScores };
  }
  let sumExp = 0;
  const expScores = new Map<L, number>();
  for (const [label, v] of logScores) {
    const e = Math.exp(v - max);
    expScores.set(label, e);
    sumExp += e;
  }
  let bestLabel: L | undefined;
  let bestConf = -1;
  for (const [label, e] of expScores) {
    // sumExp >= 1 sempre (max-shifted: pelo menos uma label tem e=1)
    const conf = e / sumExp;
    if (conf > bestConf) {
      bestConf = conf;
      bestLabel = label;
    }
  }
  return { label: bestLabel!, confidence: bestConf, scores: logScores };
}

export function serializeBayes<L extends string>(model: BayesModel<L>): string {
  return JSON.stringify({
    alpha: model.alpha,
    totalDocs: model.totalDocs,
    labelCount: Array.from(model.labelCount.entries()),
    totalTokensPerLabel: Array.from(model.totalTokensPerLabel.entries()),
    tokenLabelCount: Array.from(model.tokenLabelCount.entries()).map(([l, m]) => [
      l,
      Array.from(m.entries()),
    ]),
    vocabulary: Array.from(model.vocabulary),
  });
}

export function deserializeBayes<L extends string>(raw: string): BayesModel<L> {
  try {
    const p = JSON.parse(raw);
    /* v8 ignore start — `?? 1` / `?? 0` guardam contra payload parcial;
       serializeBayes sempre escreve campos completos. */
    const m = createBayes<L>(p.alpha ?? 1);
    m.totalDocs = p.totalDocs ?? 0;
    /* v8 ignore stop */
    m.labelCount = new Map(p.labelCount);
    m.totalTokensPerLabel = new Map(p.totalTokensPerLabel);
    m.tokenLabelCount = new Map(
      (p.tokenLabelCount as Array<[L, Array<[string, number]>]>).map(([l, entries]) => [
        l,
        new Map(entries),
      ])
    );
    m.vocabulary = new Set(p.vocabulary);
    return m;
  } catch {
    return createBayes<L>();
  }
}
