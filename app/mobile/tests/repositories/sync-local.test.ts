import { beforeEach, describe, expect, it } from 'vitest';
import { localSyncRepo } from '@/repositories/sync-local';
import { mascotLife, profiles, resetAll } from '@/lib/db';

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

  it('export/import inclui life_state da simulação', async () => {
    const p = await profiles.upsert({
      id: 'sync-life-u1',
      display_name: 'Life Sync',
      age_band: null,
      timezone: 'America/Sao_Paulo',
      locale: 'pt-BR',
      created_at: new Date().toISOString(),
    });
    await mascotLife.upsert({
      user_id: p.id,
      energy: 63,
      mood: 'feliz',
      last_simulated_at: new Date().toISOString(),
      absence_hours: 2,
      total_simulated_hours: 15,
    });

    const snap = await localSyncRepo.exportSnapshot(p.id);
    const lifeRows = snap.tables.life_state as Array<{ user_id: string; energy: number }> | undefined;
    expect(Array.isArray(lifeRows)).toBe(true);
    expect(lifeRows?.[0]?.user_id).toBe(p.id);
    expect(lifeRows?.[0]?.energy).toBe(63);

    await resetAll();
    await localSyncRepo.importSnapshot(snap);
    const restored = await mascotLife.get(p.id);
    expect(restored?.energy).toBe(63);
    expect(restored?.user_id).toBe(p.id);
  });
});
