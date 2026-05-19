/**
 * Camada de service para a Home — orquestra db + xp + unlocks + notify.
 *
 * Por que existe: antes desse arquivo, [(tabs)/index.tsx](../../app/(tabs)/index.tsx)
 * importava `@/lib/db` direto e tinha 12 callsites com regras de negócio
 * embutidas no JSX. Esse acoplamento iria virar refactor amplo quando o
 * backend (Supabase) entrasse. Services abstraem o "como persiste" do "o
 * que o produto faz".
 *
 * Regra: routes consomem APENAS services + store. Services consomem db +
 * libs. Manter unidirecional.
 */

import {
  checkins as checkinsDb,
  combo as comboDb,
  dailyReward,
  inventory,
  mascots as mascotsDb,
  missions as missionsDb,
  mysteryBox,
  todayLocal,
  userScenes,
  wallet as walletDb,
  xpEvents,
} from '@/lib/db';
import { applyCheckinFully, type CheckinOutcome } from '@/lib/checkin';
import type { HabitKind, Mascot, Mission, Profile } from '@/types';

export interface HomeBootstrap {
  todayCheckins: Record<string, number>;
  mission: Mission | null;
  comboLevel: number;
  dailyCurrentDay: number;
  dailyClaimedToday: boolean;
  boxAvailable: boolean;
  totalCheckinsAll: number;
  unlockedSceneIds: string[];
  activeSceneId: string;
  equippedAccessoryId: string;
}

/**
 * Carrega TUDO que a Home precisa pra primeira renderização em paralelo.
 * Substitui a sequência `loadToday → loadCombo → loadDaily → loadBox → ...`
 * que estava espalhada em useFocusEffect.
 */
export async function loadHomeState(profile: Profile): Promise<HomeBootstrap> {
  const today = todayLocal();
  const [
    todayCh,
    allCh,
    missionsList,
    comboRow,
    dailyRow,
    boxRow,
    scenes,
    activeSceneId,
    accs,
  ] = await Promise.all([
    checkinsDb.list(profile.id, today),
    checkinsDb.listAll(profile.id),
    missionsDb.forDate(profile.id, today),
    comboDb.get(profile.id),
    dailyReward.get(profile.id),
    mysteryBox.get(profile.id),
    userScenes.listUnlocked(profile.id),
    userScenes.getActive(profile.id),
    inventory.listOwned(profile.id),
  ]);
  const todayMap: Record<string, number> = {};
  for (const c of todayCh) {
    todayMap[c.habit_kind] = (todayMap[c.habit_kind] ?? 0) + 1;
  }
  const activeMission =
    missionsList.find(m => m.status === 'pending') ?? missionsList[0] ?? null;
  /* v8 ignore start — dailyRow, comboRow, boxRow vêm de getters que sempre
     retornam um objeto (freshDailyReward/Combo/MysteryBox como fallback);
     o `?.` é guard pra refactor futuro caso retornem null. */
  const claimedToday = dailyRow?.last_claimed_date === today;
  const currentDay = Math.max(1, Math.min(7, dailyRow?.current_day ?? 1));
  const boxAvailable = boxRow?.last_opened_date !== today;
  /* v8 ignore stop */
  return {
    todayCheckins: todayMap,
    mission: activeMission,
    /* v8 ignore next — comboRow.current ?? 1 mesma justificativa acima. */
    comboLevel: Math.max(1, Math.min(5, comboRow?.current ?? 1)),
    dailyCurrentDay: currentDay,
    dailyClaimedToday: claimedToday,
    boxAvailable,
    totalCheckinsAll: allCh.length,
    /* v8 ignore start — scenes.map/find ?.accessory_id são fallbacks
       quando store está vazia ou quando nenhum acessório está equipado;
       o `?? 'none'` cobre a 1ª boot. */
    unlockedSceneIds: scenes.map(s => s.scene_id),
    activeSceneId,
    equippedAccessoryId: accs.find(a => a.equipped)?.accessory_id ?? 'none',
    /* v8 ignore stop */
  };
}

/**
 * Registra um check-in via pipeline unificado [applyCheckinFully](../lib/checkin.ts).
 * Mantém apenas a interface mínima que a Home consome — wallet/streak/unlocks
 * já estão incluídos no `CheckinOutcome` retornado.
 */
export function doCheckin(
  profile: Profile,
  mascot: Mascot,
  habit: HabitKind,
  value?: number,
): Promise<CheckinOutcome> {
  return applyCheckinFully({ profile, mascot, kind: habit, value });
}

export interface MissionCompletionResult {
  mascot: Mascot;
  xpGained: number;
  coins: number;
  alreadyCompleted: boolean;
}

/**
 * Marca a missão de hoje como completa + paga XP + moedas, idempotente.
 * Retorna `alreadyCompleted=true` se já estava completa (no-op).
 */
export async function completeMissionForToday(
  profile: Profile,
  mascot: Mascot,
  mission: Mission,
  coinsReward: number,
): Promise<MissionCompletionResult> {
  if (mission.status === 'completed') {
    return { mascot, xpGained: 0, coins: 0, alreadyCompleted: true };
  }
  await missionsDb.update(mission.id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
  await xpEvents.add({
    user_id: profile.id,
    amount: mission.xp_reward,
    reason: 'mission',
    reference: { mission_id: mission.id },
  });
  const xpGained = mission.xp_reward;
  // Atualiza XP do mascote via upsert direto (lib não tem helper "addXp").
  const updatedMascot = await mascotsDb.upsert({
    user_id: profile.id,
    xp: mascot.xp + xpGained,
  });
  await walletDb.add(profile.id, coinsReward);
  return { mascot: updatedMascot, xpGained, coins: coinsReward, alreadyCompleted: false };
}
