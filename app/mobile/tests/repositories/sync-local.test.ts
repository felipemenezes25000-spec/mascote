import { beforeEach, describe, expect, it } from 'vitest';
import { localSyncRepo } from '@/repositories/sync-local';
import { profiles, resetAll } from '@/lib/db';

describe('localSyncRepo', () => {
  beforeEach(async () => {
    await resetAll();
  });

  it('export/import inclui evolution e subscription', async () => {
    const p = await profiles.upsert({
      id: 'sync-u1',
      display_name: 'Sync',
      age_band: null,
      timezone: 'America/Sao_Paulo',
      locale: 'pt-BR',
      created_at: new Date().toISOString(),
    });

    const snap = await localSyncRepo.exportSnapshot(p.id);
    expect(snap.userId).toBe(p.id);
    expect(snap.tables.profiles?.length).toBeGreaterThanOrEqual(1);
    expect(snap.subscription?.tier).toBe('free');

    await resetAll();
    const result = await localSyncRepo.importSnapshot(snap);
    expect(result.applied).toContain('profiles');
  });
});
