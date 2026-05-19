/**
 * Aplica recompensas reais ao desbloquear conquistas.
 */

import type { AchievementMeta } from '@/content/achievements';
import {
  checkins as checkinsDb,
  customization,
  inventory,
  mascots as mascotsDb,
  todayLocal,
  userScenes,
  wallet as walletDb,
  xpEvents,
} from '@/lib/db';
import { rememberFromMessage } from '@/lib/memory';
import { applyXp, clampMascotPhaseForTier } from '@/lib/xp';
import { subscriptionService } from '@/services/subscription';
import type { Mascot, Profile } from '@/types';

export async function applyAchievementReward(
  profile: Profile,
  mascot: Mascot,
  achievement: AchievementMeta,
): Promise<{ mascot: Mascot; label: string }> {
  const reward = achievement.reward;
  if (!reward) return { mascot, label: '' };

  switch (reward.type) {
    case 'xp': {
      const today = todayLocal();
      const dailyXpSoFar = await checkinsDb.xpSumToday(profile.id, today);
      const result = applyXp(mascot, reward.value as number, dailyXpSoFar);
      const tier = await subscriptionService.getCurrentTier(profile.id);
      const capped = clampMascotPhaseForTier(result.mascot, tier);
      if (result.delta > 0) {
        await xpEvents.add({
          user_id: profile.id,
          amount: result.delta,
          reason: 'achievement',
          reference: { achievement: achievement.id },
        });
      }
      const saved = await mascotsDb.upsert({
        user_id: mascot.user_id,
        xp: capped.xp,
        level: capped.level,
        phase: capped.phase,
      });
      return { mascot: saved, label: reward.label };
    }
    case 'coins': {
      await walletDb.add(profile.id, reward.value as number, 0);
      return { mascot, label: reward.label };
    }
    case 'accessory': {
      await inventory.unlock(profile.id, String(reward.value));
      return { mascot, label: reward.label };
    }
    case 'scene': {
      await userScenes.unlock(profile.id, String(reward.value));
      return { mascot, label: reward.label };
    }
    case 'aura': {
      const current = await customization.get(profile.id);
      const next = Math.min(1.3, Math.max(current.aura_intensity, 1.12));
      await customization.update(profile.id, { aura_intensity: next });
      return { mascot, label: reward.label };
    }
    case 'trait': {
      const patch =
        reward.value === 'curious-eyes'
          ? { eye_size: 1.1 as number }
          : { pattern_density: 1.08 as number };
      await customization.update(profile.id, patch);
      return { mascot, label: reward.label };
    }
    case 'animation': {
      const lean = reward.value === 'celebrate' ? 0.08 : 0.04;
      await customization.update(profile.id, { posture_lean: lean });
      return { mascot, label: reward.label };
    }
    case 'memory_card': {
      await rememberFromMessage(
        profile.id,
        `Memória desbloqueada: ${reward.label} (${String(reward.value)}).`,
        new Date(),
      );
      return { mascot, label: reward.label };
    }
    case 'mutation_hint':
      return { mascot, label: reward.label };
    default:
      return { mascot, label: reward.label };
  }
}
