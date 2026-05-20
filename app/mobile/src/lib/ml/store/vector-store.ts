/**
 * Vector store in-memory + persistência em AsyncStorage.
 * Brute-force cosine search — adequado pra ≤10k vetores (limite confortável
 * pro contexto single-user/single-device).
 *
 * Para escalar > 10k, trocar por HNSW (precisaria de nativo ou WASM).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cosine } from '@/lib/ml/text/tokenize';
import { logger } from '@/lib/logger';

export interface VectorRecord<M = Record<string, unknown>> {
  id: string;
  vector: number[];
  metadata?: M;
  created_at: string;
}

export interface SearchResult<M = Record<string, unknown>> {
  record: VectorRecord<M>;
  score: number;
}

const KEY = (namespace: string) => `mascote:vec:${namespace}`;

export class VectorStore<M = Record<string, unknown>> {
  private records: VectorRecord<M>[] = [];
  private loaded = false;
  // Promise da carga em andamento — múltiplas chamadas concorrentes a load()
  // (ex.: upsert + search disparados em paralelo no boot) compartilham o
  // mesmo AsyncStorage.getItem em vez de dispará-lo duas vezes e perderem
  // entre si o conteúdo do `this.records`.
  private loadingPromise: Promise<void> | null = null;
  // Cauda da fila de escritas. Serializa upsert/remove pra evitar dois
  // findIndex(-1) seguidos com o mesmo id (que produziria duplicatas).
  private writeChain: Promise<unknown> = Promise.resolve();
  constructor(private readonly namespace: string, private readonly maxRecords = 1000) {}

  private enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.writeChain.then(fn, fn);
    this.writeChain = next.catch(() => undefined);
    return next;
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY(this.namespace));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) this.records = parsed as VectorRecord<M>[];
        }
      } catch {
        this.records = [];
      }
      this.loaded = true;
    })();
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  async save(): Promise<void> {
    // FIFO eviction se passou do cap
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
    await AsyncStorage.setItem(KEY(this.namespace), JSON.stringify(this.records));
  }

  async upsert(record: VectorRecord<M>): Promise<void> {
    await this.load();
    return this.enqueueWrite(async () => {
      const idx = this.records.findIndex(r => r.id === record.id);
      if (idx >= 0) this.records[idx] = record;
      else this.records.push(record);
      await this.save();
    });
  }

  async remove(id: string): Promise<void> {
    await this.load();
    return this.enqueueWrite(async () => {
      this.records = this.records.filter(r => r.id !== id);
      await this.save();
    });
  }

  async search(
    queryVec: number[],
    opts: { limit?: number; minScore?: number; filter?: (r: VectorRecord<M>) => boolean } = {}
  ): Promise<SearchResult<M>[]> {
    await this.load();
    const { limit = 5, minScore = 0, filter } = opts;
    const scored: SearchResult<M>[] = [];
    let dimMismatches = 0;
    for (const r of this.records) {
      if (filter && !filter(r)) continue;
      // dim mismatch típico: user trocou apiKey (1536 dims OpenAI) ↔ modo local
      // (256 dims TF-IDF). Antes era silencioso e produzia 0 resultados sem
      // sinal — agora logamos contagem pra debug. Reindexar é a saída.
      if (r.vector.length !== queryVec.length) {
        dimMismatches++;
        continue;
      }
      const s = cosine(queryVec, r.vector);
      if (s > minScore) scored.push({ record: r, score: s });
    }
    if (dimMismatches > 0 && scored.length === 0) {
      logger.warn(`[vector-store] all ${dimMismatches} records have dim mismatch; reindex needed`, {
        namespace: this.namespace,
        queryDim: queryVec.length,
        mismatches: dimMismatches,
      });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  async list(): Promise<VectorRecord<M>[]> {
    await this.load();
    return [...this.records];
  }

  async clear(): Promise<void> {
    this.records = [];
    await AsyncStorage.removeItem(KEY(this.namespace));
  }

  async size(): Promise<number> {
    await this.load();
    return this.records.length;
  }
}
