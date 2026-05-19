import { describe, expect, it } from 'vitest';
import { enrichMissionTemplate, inferMissionMeta } from '@/content/mission-meta';
import type { MissionTemplate } from '@/content/missions';

const base: MissionTemplate = {
  id: 'm-test',
  title: 'Test',
  description: 'Desc',
  habit_kind: 'water',
  target_value: 2,
  xp_reward: 15,
  preferred_personalities: ['fofo'],
};

describe('mission-meta', () => {
  it('infere dificuldade e categoria por hábito', () => {
    const meta = inferMissionMeta(base);
    expect(meta.category).toBe('water');
    expect(meta.difficulty).toBeGreaterThanOrEqual(1);
    expect(meta.duration_minutes).toBeGreaterThan(0);
  });

  it('enrich preenche campos ausentes', () => {
    const enriched = enrichMissionTemplate(base);
    expect(enriched.visual_impact).toBeDefined();
    expect(enriched.evolution_type).toBe('micro');
    expect(enriched.tier).toBe('free');
  });

  it('detecta return_after_failure por id', () => {
    const meta = inferMissionMeta({ ...base, id: 'm-return-volta-1' });
    expect(meta.category).toBe('return_after_failure');
    expect(meta.tags).toContain('return_after_failure');
  });
});
