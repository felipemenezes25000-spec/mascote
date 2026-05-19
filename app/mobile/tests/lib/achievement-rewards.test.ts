import { describe, expect, it, vi, beforeEach } from 'vitest';
import { applyAchievementReward } from '@/lib/achievement-rewards';
import { customization } from '@/lib/db';
import type { AchievementMeta } from '@/content/achievements';
import type { Mascot, Profile } from '@/types';

const profile: Profile = {
  id: 'u1',
  display_name: 'Test',
  age_band: '25-34',
  timezone: 'America/Sao_Paulo',
  locale: 'pt-BR',
  created_at: '2026-01-01',
};

const mascot: Mascot = {
  id: 'm1',
  user_id: 'u1',
  name: 'Lumi',
  personality: 'fofo',
  phase: 'bebe',
  mood: 'feliz',
  xp: 100,
  level: 3,
  energy: 80,
  health: 90,
  last_seen_at: '2026-01-01',
  created_at: '2026-01-01',
};

describe('applyAchievementReward', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('aplica aura via customization', async () => {
    const updateSpy = vi.spyOn(customization, 'update').mockResolvedValue({
      user_id: 'u1',
      eye_size: 1,
      eye_spread: 1,
      body_height: 1,
      body_width: 1,
      aura_intensity: 1.12,
      pattern_density: 1,
      preferred_pattern: 'plain',
      posture_lean: 0,
      force_hide_tail: false,
      force_hide_antennae: false,
      force_hide_spikes: false,
      updated_at: '2026-01-01',
    });
    const achievement: AchievementMeta = {
      id: 'aura-primeira',
      emoji: '✨',
      title: 'Aura',
      description: 'test',
      reward: { type: 'aura', value: 'soft-glow', label: 'Aura suave' },
      check: () => true,
    };
    const result = await applyAchievementReward(profile, mascot, achievement);
    expect(updateSpy).toHaveBeenCalledWith('u1', expect.objectContaining({ aura_intensity: expect.any(Number) }));
    expect(result.label).toBe('Aura suave');
  });
});
