/**
 * Internals do "DB" (camada AsyncStorage).
 *
 * Funções `read`, `write`, `withLock`, `uid` são compartilhadas entre todos os
 * módulos de domínio em `lib/db/<domain>.ts`. Não exporte daqui pra fora do
 * pacote `lib/db/` — quem precisar, importa do `lib/db/index.ts`.
 *
 * Histórico: era tudo um único `lib/db.ts` de 1351 linhas. Quebra em domínios
 * permite (a) achar o que importa, (b) lockfile de PR menor, (c) extensão por
 * domínio sem refator amplo.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

export const KEY = (table: string) => `mascote:${table}`;
export const META_KEY = 'mascote:_meta';

type AnyRow = Record<string, unknown>;

export async function read<T>(table: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY(table));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      logger.warn(`[db] table "${table}" has non-array payload; treating as empty.`, { table });
      return [];
    }
    return parsed as T[];
  } catch (err) {
    /* v8 ignore start — JSON corrompido / storage indisponível.
       `err instanceof Error ? .message : 'unknown'` é guard pra reject com não-Error. */
    logger.warn(`[db] failed to read table "${table}"`, {
      table,
      reason: err instanceof Error ? err.message : 'unknown',
    });
    return [];
    /* v8 ignore stop */
  }
}

export async function write<T>(table: string, rows: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY(table), JSON.stringify(rows));
  } catch (err) {
    /* v8 ignore start — Disco cheio / storage indisponível. Propaga p/ caller. */
    logger.warn(`[db] failed to write table "${table}"`, {
      table,
      reason: err instanceof Error ? err.message : 'unknown',
    });
    throw err;
    /* v8 ignore stop */
  }
}

export async function readAny(table: string): Promise<AnyRow[]> {
  return read<AnyRow>(table);
}

export async function writeAny(table: string, rows: AnyRow[]): Promise<void> {
  return write<AnyRow>(table, rows);
}

let uidCounter = 0;
let uidLastMs = 0;

export function uid(prefix = ''): string {
  const now = Date.now();
  /* v8 ignore next 6 — uniqueness guard: counter incrementa quando 2 uids
     são gerados no mesmo ms (raro mas possível em loops apertados de tests).
     Testar requer mockar Date.now síncrono — não vale o custo. */
  if (now === uidLastMs) {
    uidCounter++;
  } else {
    uidCounter = 0;
    uidLastMs = now;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  const counter = uidCounter.toString(36);
  return `${prefix}${now.toString(36)}${counter}_${rand}`;
}

const tableLocks = new Map<string, Promise<unknown>>();

export async function withLock<T>(table: string, fn: () => Promise<T>): Promise<T> {
  const prev = tableLocks.get(table) ?? Promise.resolve();
  const result = prev.then(fn, fn);
  const tail = result.catch(() => undefined);
  tableLocks.set(table, tail);
  try {
    return await result;
  } finally {
    if (tableLocks.get(table) === tail) {
      tableLocks.delete(table);
    }
  }
}

export function normalizeSceneId(id: string): string {
  return id === 'quarto' ? 'room' : id;
}
