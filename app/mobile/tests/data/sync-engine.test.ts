/**
 * Testes do SyncEngine e fila offline.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { syncEngine, getSyncMode } from '@/data/sync/SyncEngine';
import { syncQueue } from '@/data/sync/SyncQueue';
import { resolveConflict } from '@/data/sync/ConflictResolution';

const UID = 'sync-test-user';

describe('SyncEngine', () => {
  it('modo local_only sem Supabase env', () => {
    expect(getSyncMode()).toBe('local_only');
    expect(syncEngine.mode).toBe('local_only');
  });

  it('pushPending no-op em local_only', async () => {
    const r = await syncEngine.pushPending(UID);
    expect(r.pushed).toBe(0);
    expect(r.failed).toBe(0);
  });
});

describe('SyncQueue', () => {
  beforeEach(async () => {
    await syncQueue.clear(UID);
  });

  it('enfileira e remove com ack', async () => {
    const op = await syncQueue.enqueue(UID, {
      table: 'profiles',
      action: 'upsert',
      payload: { id: '1' },
    });
    expect((await syncQueue.list(UID)).length).toBe(1);
    await syncQueue.ack(UID, op.id);
    expect((await syncQueue.list(UID)).length).toBe(0);
  });
});

describe('ConflictResolution', () => {
  it('newest_wins escolhe timestamp mais recente', () => {
    const local = { updatedAt: '2026-01-01T00:00:00Z', value: 'local' };
    const remote = { updatedAt: '2026-02-01T00:00:00Z', value: 'remote' };
    expect(resolveConflict(local, remote).value).toBe('remote');
  });
});
