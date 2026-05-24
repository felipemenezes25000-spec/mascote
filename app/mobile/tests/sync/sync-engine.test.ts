/**
 * Testes do SyncEngine e fila offline.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { syncEngine, getSyncMode } from '@/sync/SyncEngine';
import { syncQueue } from '@/sync/SyncQueue';
import { resolveConflict } from '@/sync/ConflictResolution';

const UID = 'sync-test-user';

describe('SyncEngine', () => {
  it('modo sempre local_only (sem backend remoto)', () => {
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

  it('enfileira e lista operações', async () => {
    const op = await syncEngine.queueMutation(UID, 'checkins', 'upsert', { id: 'c1' });
    const list = await syncQueue.list(UID);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(op.id);
  });

  it('ack remove da fila', async () => {
    const op = await syncEngine.queueMutation(UID, 'missions', 'delete', { id: 'm1' });
    await syncQueue.ack(UID, op.id);
    expect(await syncQueue.list(UID)).toHaveLength(0);
  });
});

describe('resolveConflict', () => {
  it('newest_wins escolhe o mais recente', () => {
    const local = { updatedAt: '2026-01-01T00:00:00Z', value: 'local' };
    const remote = { updatedAt: '2026-01-02T00:00:00Z', value: 'remote' };
    expect(resolveConflict(local, remote).value).toBe('remote');
  });
});
