import { describe, expect, it } from 'vitest';
import { fullMissionCatalog } from '@/content/missions';

describe('mission catalog', () => {
  it('tem 300+ missões únicas', () => {
    const ids = new Set(fullMissionCatalog.map(m => m.id));
    expect(fullMissionCatalog.length).toBeGreaterThanOrEqual(300);
    expect(ids.size).toBe(fullMissionCatalog.length);
  });

  it('cada missão tem metadados gamificação', () => {
    expect(fullMissionCatalog.every(m => m.duration_minutes != null && m.difficulty != null)).toBe(true);
    expect(fullMissionCatalog.every(m => m.category && m.tags && m.tags.length > 0)).toBe(true);
  });

  it('estrutura pronta para escalar até 400+', () => {
    expect(fullMissionCatalog.length).toBeLessThanOrEqual(450);
    expect(fullMissionCatalog.every(m => m.habit_kind && m.xp_reward > 0)).toBe(true);
  });
});
