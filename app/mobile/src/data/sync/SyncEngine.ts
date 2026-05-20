/**
 * Motor de sync — orquestra export/import local e fila remota opcional.
 */

import { isSupabaseConfigured } from '@/repositories/supabase-stub';
import { localSyncRepo } from '@/repositories/sync-local';
import type { SyncPayload, SyncPullResult } from '@/repositories/sync';
import { syncQueue } from './SyncQueue';
import { logger } from '@/lib/logger';

export type SyncMode = 'local_only' | 'remote_ready';

export function getSyncMode(): SyncMode {
  return isSupabaseConfigured() ? 'remote_ready' : 'local_only';
}

export class SyncEngine {
  get mode(): SyncMode {
    return getSyncMode();
  }

  async exportSnapshot(userId: string): Promise<SyncPayload> {
    return localSyncRepo.exportSnapshot(userId);
  }

  async importSnapshot(payload: SyncPayload): Promise<SyncPullResult> {
    return localSyncRepo.importSnapshot(payload);
  }

  async pushPending(userId: string): Promise<{ pushed: number; failed: number }> {
    if (this.mode === 'local_only') {
      return { pushed: 0, failed: 0 };
    }
    const ops = await syncQueue.list(userId);
    let pushed = 0;
    let failed = 0;
    for (const op of ops) {
      try {
        // Futuro: POST /sync/ops com Supabase
        logger.dev('[sync] pending op (stub)', { table: op.table, action: op.action });
        await syncQueue.ack(userId, op.id);
        pushed++;
      } catch {
        failed++;
      }
    }
    return { pushed, failed };
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
