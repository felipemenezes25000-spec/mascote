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

  async pushPending(_userId: string): Promise<{ pushed: number; failed: number }> {
    return { pushed: 0, failed: 0 };
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
