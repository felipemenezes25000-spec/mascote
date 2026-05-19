/**
 * Embedding wrapper híbrido:
 *  - Se há `apiKey`, usa OpenAI (semântico real, 1536 dims)
 *  - Senão, usa local TF-IDF hashing (determinístico, 256 dims, sub-ms)
 *
 * As duas APIs retornam `number[]` mas em DIMENSÕES diferentes. Caller
 * deve consultar `dim()` antes de comparar vetores entre fontes.
 *
 * Para uso prático: o "modo" é fixado quando o user pluga/despluga apiKey
 * — recomendamos reindexar o vector store se mudar.
 */

import { embedLocal, LOCAL_EMBED_DIM } from './local';
import { embedOpenAI } from './openai';
import { logger } from '@/lib/logger';
import { cosine } from '@/lib/ml/text/tokenize';
import type { TfIdfStats } from '@/lib/ml/text/tfidf';

export type EmbedMode = 'local' | 'openai';

export interface EmbedConfig {
  mode: EmbedMode;
  apiKey?: string;
  /** Stats TF-IDF do user — necessário pra modo local. */
  stats?: TfIdfStats;
}

export const OPENAI_EMBED_DIM = 1536;

export function detectMode(config: { apiKey?: string }): EmbedMode {
  return config.apiKey ? 'openai' : 'local';
}

export async function embed(text: string, config: EmbedConfig): Promise<number[]> {
  if (config.mode === 'openai' && config.apiKey) {
    try {
      return await embedOpenAI(text, config.apiKey);
    } catch (err) {
      /* v8 ignore next 2 — fallback OpenAI→local raramente exercitado em
         testes; o branch err instanceof Error é defensivo. */
      logger.warn('[embed] OpenAI falhou, caindo pra local', { reason: err instanceof Error ? err.message : 'unknown' });
    }
  }
  /* v8 ignore next 3 — TS exige stats no tipo EmbedConfig quando mode='local';
     este guard runtime cobre chamadas inseguras de JS puro. */
  if (!config.stats) {
    throw new Error('[embed] modo local exige TfIdfStats');
  }
  return embedLocal(text, config.stats);
}

export function dim(mode: EmbedMode): number {
  return mode === 'openai' ? OPENAI_EMBED_DIM : LOCAL_EMBED_DIM;
}

/** Re-export pra consumers não precisarem importar de tokenize. */
export { cosine };
