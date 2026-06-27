import { describe, expect, it, vi, beforeEach } from 'vitest';
import { applyAchievementReward } from '@/lib/achievement-rewards';
import { checkins as checkinsDb, customization, mascots as mascotsDb, xpEvents } from '@/lib/db';
import { subscriptionService } from '@/services/subscription';
import { XP_DAILY_CAP } from '@/lib/xp';
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

  // Regressão (auditoria backend 2026-06-27 ajuste1): várias conquistas de XP
  // desbloqueadas no MESMO check-in não podem estourar o XP_DAILY_CAP. O baseline
  // do cap (checkinsDb.xpSumToday) só conta a tabela checkins; sem threadar o XP
  // de conquista já concedido, cada conquista via o cap inteiro restante.
  it('múltiplas conquistas de XP no mesmo loop não estouram o cap diário', async () => {
    vi.spyOn(checkinsDb, 'xpSumToday').mockResolvedValue(100); // já 100 XP de check-ins hoje
    vi.spyOn(xpEvents, 'add').mockResolvedValue(undefined as never);
    vi.spyOn(subscriptionService, 'getCurrentTier').mockResolvedValue('plus_monthly');
    vi.spyOn(mascotsDb, 'upsert').mockImplementation(async (m) => ({ ...mascot, ...m }) as Mascot);

    const xpAch = (id: string): AchievementMeta => ({
      id,
      emoji: '⭐',
      title: id,
      description: 'x',
      reward: { type: 'xp', value: 40, label: '+40 XP' },
      check: () => true,
    });

    // Simula o loop de processUnlocks com o acumulador threadado.
    let current: Mascot = { ...mascot, xp: 100 };
    let achievementXpToday = 0;
    for (const id of ['a1', 'a2', 'a3']) {
      const applied = await applyAchievementReward(profile, current, xpAch(id), achievementXpToday);
      achievementXpToday += Math.max(0, applied.mascot.xp - current.xp);
      current = applied.mascot;
    }

    // baseline 100 + cap 150 ⇒ no máximo 50 de XP de conquista. Total ≤ cap.
    expect(achievementXpToday).toBe(XP_DAILY_CAP - 100);
    expect(current.xp).toBeLessThanOrEqual(XP_DAILY_CAP);
  });
});
