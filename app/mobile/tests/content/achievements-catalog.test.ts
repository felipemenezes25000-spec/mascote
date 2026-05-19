import { describe, expect, it } from 'vitest';
import { achievementCatalog } from '@/content/achievements';

const REWARD_TYPES = [
  'xp',
  'coins',
  'accessory',
  'scene',
  'aura',
  'animation',
  'trait',
  'memory_card',
  'mutation_hint',
] as const;

describe('achievement catalog', () => {
  it('cobre categorias de recompensa do spec', () => {
    const types = new Set(achievementCatalog.map(a => a.reward?.type).filter(Boolean));
    for (const t of ['accessory', 'scene', 'aura', 'animation', 'trait', 'memory_card'] as const) {
      expect(types.has(t)).toBe(true);
    }
    expect(achievementCatalog.length).toBeGreaterThanOrEqual(20);
  });

  it('todas as recompensas usam tipos válidos', () => {
    for (const a of achievementCatalog) {
      if (!a.reward) continue;
      expect(REWARD_TYPES).toContain(a.reward.type);
    }
  });
});
