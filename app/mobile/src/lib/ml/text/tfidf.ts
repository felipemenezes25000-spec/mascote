/**
 * TF-IDF incremental: aprende vocabulário do corpus do user à medida
 * que mensagens chegam. Diferente de keyword overlap, dá peso menor
 * pra termos comuns ("oi", "tô") e peso maior pra termos discriminantes
 * ("ansiedade", "prova").
 *
 * Math:
 *   tf(t, d) = count(t in d) / len(d)
 *   idf(t) = log((N + 1) / (df(t) + 1)) + 1   (smoothed)
 *   tfidf(t, d) = tf(t, d) * idf(t)
 */

import { cosineSparse, tokenize } from './tokenize';

export interface TfIdfStats {
  /** Document frequency: em quantos documentos cada token apareceu. */
  df: Map<string, number>;
  /** Total de documentos no corpus. */
  n: number;
}

export function emptyStats(): TfIdfStats {
  return { df: new Map(), n: 0 };
}

/** Atualiza estatísticas incrementando com um novo documento. */
export function addDocument(stats: TfIdfStats, doc: string): TfIdfStats {
  const tokens = new Set(tokenize(doc));
  for (const t of tokens) {
    stats.df.set(t, (stats.df.get(t) ?? 0) + 1);
  }
  stats.n += 1;
  return stats;
}

/** Vetor TF-IDF esparso para um documento dado o corpus stats. */
export function tfidfVector(doc: string, stats: TfIdfStats): Map<string, number> {
  const tokens = tokenize(doc);
  if (tokens.length === 0) return new Map();
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const len = tokens.length;
  const vec = new Map<string, number>();
  for (const [t, count] of tf) {
    const tfNorm = count / len;
    const df = stats.df.get(t) ?? 0;
    // smoothed IDF (evita div/0 e tokens nunca vistos no corpus = max idf)
    const idf = Math.log((stats.n + 1) / (df + 1)) + 1;
    vec.set(t, tfNorm * idf);
  }
  return vec;
}

/** Similaridade TF-IDF entre dois docs no mesmo corpus. */
export function tfidfSimilarity(a: string, b: string, stats: TfIdfStats): number {
  return cosineSparse(tfidfVector(a, stats), tfidfVector(b, stats));
}

/** Serializa stats pra persistir em AsyncStorage. */
export function serializeStats(stats: TfIdfStats): string {
  return JSON.stringify({
    n: stats.n,
    df: Array.from(stats.df.entries()),
  });
}

export function deserializeStats(raw: string): TfIdfStats {
  try {
    const parsed = JSON.parse(raw) as { n: number; df: [string, number][] };
    return { n: parsed.n, df: new Map(parsed.df) };
  } catch {
    return emptyStats();
  }
}
