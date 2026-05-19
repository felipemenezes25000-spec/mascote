/**
 * Embeddings via OpenAI (text-embedding-3-small, 1536 dims, $0.02/1M tokens).
 * Cache local em AsyncStorage indexado por hash do texto pra evitar
 * chamadas repetidas (idempotência + economia).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashToken } from '@/lib/ml/text/tokenize';

const OPENAI_EMBED_DIM = 1536;
const OPENAI_TIMEOUT_MS = 15_000;
const CACHE_PREFIX = 'mascote:embed_cache:';
const MAX_CACHE_ENTRIES = 500;

function cacheKey(text: string): string {
  // hash 32-bit + comprimento pra reduzir colisão acidental
  return `${CACHE_PREFIX}${hashToken(text, 0xFFFFFFFF)}_${text.length}`;
}

async function readCached(text: string): Promise<number[] | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(text));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === OPENAI_EMBED_DIM) {
      return parsed as number[];
    }
    return null;
  } catch {
    return null;
  }
}

async function writeCached(text: string, vec: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(text), JSON.stringify(vec));
    // Best-effort cache eviction: se passou de N entries, deleta as 20% mais antigas.
    void evictIfNeeded();
  } catch {
    // ignora — cache é melhoria, não bloqueante
  }
}

let evictionRunning = false;
async function evictIfNeeded(): Promise<void> {
  /* v8 ignore next — guard de re-entrância (raro: duas calls sobrepostas
     no mesmo tick); a 2ª call apenas retorna imediato. */
  if (evictionRunning) return;
  evictionRunning = true;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length < MAX_CACHE_ENTRIES) return;
    // Sem timestamp por chave (custo extra de read), evict aleatório 20%
    /* v8 ignore next — `() => Math.random() - 0.5` é compare function de sort;
       só executa se cacheKeys >= MAX_CACHE_ENTRIES (timing-dependent). */
    const toRemove = cacheKeys
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(MAX_CACHE_ENTRIES * 0.2));
    await AsyncStorage.multiRemove(toRemove);
  } catch {
    /* v8 ignore next — falha de storage no eviction não é fatal:
       o cache continua acima do limite mas o app não quebra. */
  } finally {
    evictionRunning = false;
  }
}

export async function embedOpenAI(text: string, apiKey: string): Promise<number[]> {
  const cached = await readCached(text);
  if (cached) return cached;

  const controller = new AbortController();
  /* v8 ignore next — abort callback só dispara após 15s timeout real. */
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OpenAI embed ${res.status}`);
    const data = await res.json();
    const vec: number[] = data?.data?.[0]?.embedding;
    if (!Array.isArray(vec) || vec.length !== OPENAI_EMBED_DIM) {
      throw new Error('embedding malformado');
    }
    await writeCached(text, vec);
    return vec;
  } finally {
    clearTimeout(timer);
  }
}

export async function clearEmbeddingCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
  await AsyncStorage.multiRemove(cacheKeys);
}
