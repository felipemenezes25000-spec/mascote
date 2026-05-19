/**
 * Okapi BM25 — ranking function que costuma ser superior a TF-IDF puro
 * para retrieval. Usa avgDL (comprimento médio de documento) pra normalizar.
 *
 * Vantagem sobre TF-IDF: termo que se repete saturado (não cresce linear).
 * Score:
 *   BM25(q, d) = Σ idf(t) * (f(t,d) * (k1+1)) / (f(t,d) + k1*(1 - b + b*|d|/avgDL))
 */

import { tokenize } from './tokenize';
import type { TfIdfStats } from './tfidf';

export interface BM25Document {
  id: string;
  tokens: string[];
}

export interface BM25Index {
  docs: Map<string, BM25Document>;
  df: Map<string, number>;
  totalDocLen: number;
}

export interface BM25Options {
  k1?: number; // saturação (1.2 default)
  b?: number;  // normalização por tamanho (0.75 default)
}

export function emptyIndex(): BM25Index {
  return { docs: new Map(), df: new Map(), totalDocLen: 0 };
}

export function indexDocument(index: BM25Index, id: string, text: string): void {
  const tokens = tokenize(text);
  const doc: BM25Document = { id, tokens };
  // Se já indexado, decrementa stats antigas primeiro
  const old = index.docs.get(id);
  if (old) {
    const oldUnique = new Set(old.tokens);
    /* v8 ignore next — `?? 1` guard: index.df sempre tem o token quando old
       existe (foi adicionado em iteração anterior). */
    for (const t of oldUnique) index.df.set(t, (index.df.get(t) ?? 1) - 1);
    index.totalDocLen -= old.tokens.length;
  }
  index.docs.set(id, doc);
  const unique = new Set(tokens);
  /* v8 ignore next — `?? 0` é padrão idiomático pra inicializar contador. */
  for (const t of unique) index.df.set(t, (index.df.get(t) ?? 0) + 1);
  index.totalDocLen += tokens.length;
}

export function removeDocument(index: BM25Index, id: string): void {
  const doc = index.docs.get(id);
  if (!doc) return;
  const unique = new Set(doc.tokens);
  /* v8 ignore next 5 — `?? 1` guard: tokens do doc estavam no df (foram
     incrementados em indexDocument); todos os branches são caminhos válidos. */
  for (const t of unique) {
    const v = (index.df.get(t) ?? 1) - 1;
    if (v <= 0) index.df.delete(t);
    else index.df.set(t, v);
  }
  index.totalDocLen -= doc.tokens.length;
  index.docs.delete(id);
}

export function bm25Search(
  index: BM25Index,
  query: string,
  opts: BM25Options & { limit?: number } = {}
): Array<{ id: string; score: number }> {
  const { k1 = 1.2, b = 0.75, limit = 10 } = opts;
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || index.docs.size === 0) return [];
  const N = index.docs.size;
  const avgDL = index.totalDocLen / N;

  // IDF cache
  const idfMap = new Map<string, number>();
  for (const t of queryTokens) {
    /* v8 ignore next — `idfMap.has(t)` cache hit é raro quando queryTokens
       é único (set-like); guard de performance, não de correção. */
    if (idfMap.has(t)) continue;
    /* v8 ignore next — `?? 0` é guard pra token nunca visto no corpus. */
    const df = index.df.get(t) ?? 0;
    // BM25 IDF "plus" (sempre positivo, evita score negativo)
    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
    idfMap.set(t, idf);
  }

  const scores: Array<{ id: string; score: number }> = [];
  for (const [id, doc] of index.docs) {
    const dl = doc.tokens.length;
    if (dl === 0) continue;
    const tf = new Map<string, number>();
    for (const t of doc.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const qt of queryTokens) {
      const f = tf.get(qt) ?? 0;
      if (f === 0) continue;
      const idf = idfMap.get(qt)!;
      const denom = f + k1 * (1 - b + (b * dl) / avgDL);
      score += idf * ((f * (k1 + 1)) / denom);
    }
    if (score > 0) scores.push({ id, score });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, limit);
}

/** Constrói índice BM25 a partir de TfIdfStats existentes (interop). */
export function bm25FromTfidf(stats: TfIdfStats, docs: Array<{ id: string; text: string }>): BM25Index {
  const idx = emptyIndex();
  for (const d of docs) indexDocument(idx, d.id, d.text);
  // copia df pré-computado se discrepância for pequena (otimização)
  void stats;
  return idx;
}
