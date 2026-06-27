import {
  achievements as achievementsDb,
  checkins as checkinsDb,
  inventory,
  mascots,
  messages as messagesDb,
  missions as missionsDb,
  userScenes,
} from '@/lib/db';
import { accessoryCatalog, checkUnlock as checkAccessoryUnlock } from '@/content/accessories';
import { achievementCatalog } from '@/content/achievements';
import { applyAchievementReward } from '@/lib/achievement-rewards';
import { checkSceneUnlock, scenesCatalog } from '@/content/scenes';
import { activeSeasonalEvent } from '@/content/seasonal';
import { entitlementService } from '@/services/subscription/EntitlementService';
import { subscriptionService } from '@/services/subscription';
import type { Mascot, Profile, Streak } from '@/types';

export interface UnlockResult {
  mascot: Mascot;
  accessories: { id: string; name: string; emoji: string }[];
  scenes: { id: string; name: string; emoji: string }[];
  achievements: { id: string; title: string; emoji: string; description: string }[];
}

export async function processUnlocks(
  profile: Profile,
  mascot: Mascot,
  streak: Streak
): Promise<UnlockResult> {
  const result: UnlockResult = { mascot, accessories: [], scenes: [], achievements: [] };
  let currentMascot = mascot;

  // Paraleliza reads (eram 6 sequenciais ~150ms+ no AsyncStorage).
  const [allCheckins, allMissions, messagesCount, ownedAchievements, ownedAcc, ownedScenes] =
    await Promise.all([
      checkinsDb.listAll(profile.id),
      missionsDb.list(profile.id),
      messagesDb.count(profile.id, 'user'),
      achievementsDb.listUnlocked(profile.id),
      inventory.listOwned(profile.id),
      userScenes.listUnlocked(profile.id),
    ]);
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const habitVariety = new Set(allCheckins.map(c => c.habit_kind)).size;
  const buildCtx = (m: Mascot) => ({
    level: m.level,
    totalXp: m.xp,
    totalCheckins: allCheckins.length,
    currentStreak: streak.current_streak,
    longestStreak: streak.longest_streak,
    daysSinceCreated,
    messagesSent: messagesCount,
    missionsCompleted: allMissions.filter(m => m.status === 'completed').length,
    habitVariety,
  });
  let ctx = buildCtx(currentMascot);
  const ownedAchIds = new Set(ownedAchievements.map(a => a.achievement_id));
  // Acumula o XP de conquista já concedido NESTE loop pra threadar como baseline
  // do cap diário — sem isto, várias conquistas de XP no mesmo check-in cada uma
  // via o cap inteiro restante (checkinsDb.xpSumToday não conta xp_events) e o
  // total estourava o XP_DAILY_CAP. clampMascotPhaseForTier só mexe em `phase`,
  // nunca em `xp`, então o delta real é (mascot.xp após − antes).
  let achievementXpToday = 0;
  for (const ach of achievementCatalog) {
    if (ownedAchIds.has(ach.id)) continue;
    if (ach.check(ctx)) {
      const unlocked = await achievementsDb.unlock(profile.id, ach.id);
      /* v8 ignore next — `if (unlocked)` é guard porque achievementsDb.unlock
         retorna null se já desbloqueado, mas o `ownedAchIds.has(ach.id)` acima
         já filtra esse caso. Race condition entre 2 scans simultâneos. */
      if (unlocked) {
        const applied = await applyAchievementReward(profile, currentMascot, ach, achievementXpToday);
        achievementXpToday += Math.max(0, applied.mascot.xp - currentMascot.xp);
        currentMascot = applied.mascot;
        ctx = buildCtx(currentMascot);
        result.achievements.push({
          id: ach.id,
          title: ach.title,
          emoji: ach.emoji,
          description: ach.description + (applied.label ? ` · ${applied.label}` : ''),
        });
      }
    }
  }
  const tier = await subscriptionService.getCurrentTier(profile.id);
  // Progresso de desbloqueio visual: não regride se recompensa de conquista
  // recalculou level a partir do XP (ex.: level 6 salvo com xp=0 no teste).
  const unlockLevel = Math.max(currentMascot.level, mascot.level);

  // === Accessories
  const ownedAccIds = new Set(ownedAcc.map(a => a.accessory_id));
  // Acessórios sazonais (kind: 'seasonal', value: mês 1..12) só são checados
  // quando há um seasonalEvent ativo cujo startMonth bata.
  const seasonal = activeSeasonalEvent();
  const activeSeasonalMonth = seasonal?.startMonth;
  for (const acc of accessoryCatalog) {
    if (ownedAccIds.has(acc.id)) continue;
    if (
      checkAccessoryUnlock(acc, {
        level: unlockLevel,
        currentStreak: streak.current_streak,
        longestStreak: streak.longest_streak,
        totalCheckins: allCheckins.length,
        activeSeasonalMonth,
      })
    ) {
      await inventory.unlock(profile.id, acc.id);
      result.accessories.push({ id: acc.id, name: acc.name, emoji: acc.emoji });
    }
  }

  // === Scenes
  const ownedSceneIds = new Set(ownedScenes.map(s => s.scene_id));
  // garantir default
  if (!ownedSceneIds.has('room')) {
    await userScenes.unlock(profile.id, 'room');
    await userScenes.setActive(profile.id, 'room');
    ownedSceneIds.add('room');
  }
  for (const sc of scenesCatalog) {
    if (ownedSceneIds.has(sc.id)) continue;
    if (sc.premium && !entitlementService.canAccessScene(tier, sc.id)) continue;
    if (
      checkSceneUnlock(sc, {
        level: unlockLevel,
        currentStreak: streak.current_streak,
        longestStreak: streak.longest_streak,
      })
    ) {
      await userScenes.unlock(profile.id, sc.id);
      result.scenes.push({ id: sc.id, name: sc.name, emoji: sc.emoji });
    }
  }

  if (currentMascot.xp !== mascot.xp || currentMascot.level !== mascot.level) {
    currentMascot = await mascots.upsert({
      user_id: currentMascot.user_id,
      xp: currentMascot.xp,
      level: currentMascot.level,
      phase: currentMascot.phase,
    });
  }

  result.mascot = currentMascot;
  return result;
}
