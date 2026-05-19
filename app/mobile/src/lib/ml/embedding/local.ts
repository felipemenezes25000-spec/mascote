/**
 * Embedding local via hashing trick: tokens → buckets fixos, valor = TF-IDF.
 * Não é "embedding semântico" como BERT, mas é determinístico, rápido
 * (sub-ms) e funciona offline.
 *
 * Tradeoff: dois sinônimos com tokens diferentes ("ansioso" vs "nervoso")
 * caem em buckets diferentes. Solução parcial: stemmer agressivo.
 */

import { hashToken, tokenize } from '@/lib/ml/text/tokenize';
import { tfidfVector, type TfIdfStats } from '@/lib/ml/text/tfidf';

export const LOCAL_EMBED_DIM = 256;

/**
 * Embedding denso de tamanho fixo. Usa TF-IDF como valor, hashing pra dim.
 */
export function embedLocal(text: string, stats: TfIdfStats, dim = LOCAL_EMBED_DIM): number[] {
  const vec = new Array(dim).fill(0) as number[];
  const tfidf = tfidfVector(text, stats);
  if (tfidf.size === 0) {
    /* v8 ignore start — tfidfVector retorna Map vazio APENAS se tokens=[],
       e o fallback aqui chama o mesmo tokenize. Caminho redundante mantido
       como guard caso a heurística de tokenize mude. */
    const tokens = tokenize(text);
    for (const t of tokens) {
      const h = hashToken(t, dim);
      vec[h] += 1;
    }
    /* v8 ignore stop */
  } else {
    for (const [token, weight] of tfidf) {
      const h = hashToken(token, dim);
      vec[h] += weight;
    }
  }
  // L2 normalize
  let norm = 0;
  for (const v of vec) norm += v * v;
  if (norm === 0) return vec;
  const inv = 1 / Math.sqrt(norm);
  for (let i = 0; i < dim; i++) vec[i] *= inv;
  return vec;
}
