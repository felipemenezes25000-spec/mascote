/**
 * Aplica recompensas reais ao desbloquear conquistas.
 */

import type { AchievementMeta } from '@/content/achievements';
import { inventory, mascots as mascotsDb, userScenes, wallet as walletDb } from '@/lib/db';
import { applyXp } from '@/lib/xp';
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
      const result = applyXp(mascot, reward.value as number, 0);
      const saved = await mascotsDb.upsert({
        user_id: mascot.user_id,
        xp: result.mascot.xp,
        level: result.mascot.level,
        phase: result.mascot.phase,
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
    case 'aura':
    case 'animation':
    case 'trait':
    case 'memory_card':
    case 'mutation_hint':
      return { mascot, label: reward.label };
    default:
      return { mascot, label: reward.label };
  }
}
