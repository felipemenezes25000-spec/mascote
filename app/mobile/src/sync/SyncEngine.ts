/**
 * Motor de sync — orquestra export/import local. Sem backend remoto.
 */

import { localSyncRepo } from '@/repositories/sync-local';
import type { SyncPayload, SyncPullResult } from '@/repositories/sync';
import { syncQueue } from './SyncQueue';

export type SyncMode = 'local_only';

export function getSyncMode(): SyncMode {
  return 'local_only';
}

export class SyncEngine {
  get mode(): SyncMode {
    return 'local_only';
  }

  async exportSnapshot(userId: string): Promise<SyncPayload> {
    return localSyncRepo.exportSnapshot(userId);
  }

  async importSnapshot(payload: SyncPayload): Promise<SyncPullResult> {
    return localSyncRepo.importSnapshot(payload);
  }

  async pushPending(userId: string): Promise<{ pushed: number; failed: number }> {
    // Modo local_only: backend remoto ainda não existe. Antes esse stub era
    // no-op enquanto `queueMutation` continuava enfileirando — fila acumulava
    // até MAX_QUEUE_ITEMS=5000 e perdia ops antigas via FIFO drop.
    // Como não há ack remoto, drenamos as ops localmente (já foram aplicadas
    // ao AsyncStorage no momento da escrita pelo respectivo db layer; a fila
    // serve só pro futuro replay quando o sync remoto entrar).
    //
    // ANTES: `list()` + `clear()` em duas chamadas separadas — qualquer enqueue
    // entre as duas era apagado pelo clear sem nunca ser "pushed". `drainAll`
    // faz read+remove atomico sob o mesmo lock.
    const pending = await syncQueue.drainAll(userId);
    if (pending.length === 0) return { pushed: 0, failed: 0 };
    return { pushed: pending.length, failed: 0 };
  }

  async queueMutation(
    userId: string,
    table: string,
    action: 'upsert' | 'delete',
    payload: unknown,
  ) {
    return syncQueue.enqueue(userId, { table, action, payload });
  }
}

export const syncEngine = new SyncEngine();
