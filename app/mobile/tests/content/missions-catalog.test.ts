import { describe, expect, it } from 'vitest';
import { fullMissionCatalog } from '@/content/missions';

describe('mission catalog', () => {
  it('tem 150+ missões únicas', () => {
    const ids = new Set(fullMissionCatalog.map(m => m.id));
    expect(fullMissionCatalog.length).toBeGreaterThanOrEqual(150);
    expect(ids.size).toBe(fullMissionCatalog.length);
  });

  it('estrutura pronta para escalar até 300+', () => {
    expect(fullMissionCatalog.length).toBeLessThanOrEqual(400);
    expect(fullMissionCatalog.every(m => m.habit_kind && m.xp_reward > 0)).toBe(true);
  });
});
