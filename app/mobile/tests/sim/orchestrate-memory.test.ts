import { beforeEach, describe, expect, it, vi } from 'vitest';
import { orchestrateLifeSimulation } from '@/sim/orchestrate';
import { mascots, profiles, resetAll } from '@/lib/db';
import { listMemories } from '@/lib/memory';

declare const __asyncStorageReset: () => void;

describe('orchestrateLifeSimulation memory bridge', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    __asyncStorageReset();
    await resetAll();
  });

  it('grava memória leve quando há ausência longa', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-24T12:00:00.000Z').getTime());
    const profile = await profiles.upsert({ display_name: 'Mem', age_band: '25-34' });
    const mascot = await mascots.upsert({
      user_id: profile.id,
      name: 'Bipo',
      personality: 'calmo',
      phase: 'bebe',
      mood: 'ok',
      energy: 82,
      last_seen_at: new Date('2026-05-21T12:00:00.000Z').toISOString(),
      dna_seed: 123,
    });

    await orchestrateLifeSimulation(mascot);
    const memories = await listMemories(profile.id);
    expect(memories.some(m => m.summary.includes('Momento em ausência:'))).toBe(true);
  });

  it('não duplica mesma memória em reexecução curta', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-24T12:00:00.000Z').getTime());
    const profile = await profiles.upsert({ display_name: 'Mem2', age_band: '25-34' });
    const mascot = await mascots.upsert({
      user_id: profile.id,
      name: 'Lumo',
      personality: 'fofo',
      phase: 'bebe',
      mood: 'ok',
      energy: 80,
      last_seen_at: new Date('2026-05-22T10:00:00.000Z').toISOString(),
      dna_seed: 456,
    });

    await orchestrateLifeSimulation(mascot);
    await orchestrateLifeSimulation(mascot);
    const memories = await listMemories(profile.id);
    const returnMemories = memories.filter(m => m.summary.includes('Momento em ausência:'));
    expect(returnMemories.length).toBe(1);
  });
});
