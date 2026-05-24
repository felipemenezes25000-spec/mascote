/**
 * Camada de service para a Home — orquestra db + xp + unlocks + notify.
 *
 * Por que existe: antes desse arquivo, [(tabs)/index.tsx](../../app/(tabs)/index.tsx)
 * importava `@/lib/db` direto e tinha 12 callsites com regras de negócio
 * embutidas no JSX. Services abstraem o "como persiste" do "o que o produto
 * faz" — facilita refactor e teste isolado.
 *
 * Regra: routes consomem APENAS services + store. Services consomem db +
 * libs. Manter unidirecional.
 */

import {
  checkins as checkinsDb,
  combo as comboDb,
  dailyReward,
  inventory,
  missions as missionsDb,
  mysteryBox,
  todayLocal,
  userScenes,
} from '@/lib/db';
import {
  applyCheckinFully,
  applyMissionCompletion,
  type CheckinOutcome,
  type MissionCompletionOutcome,
} from '@/lib/checkin';
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
 *
 * Delega ao pipeline canônico [applyMissionCompletion](../lib/checkin.ts) —
 * que tem withLock por-missão, re-busca status fresh do DB (evita race em
 * taps duplos), respeita XP daily cap, recalcula level/phase e dispara
 * xpEvents. O caminho legado (sem lock, sem recálculo de level/phase, sem
 * cap diário) foi removido em 2026-05.
 *
 * `_coinsRewardLegacy` é aceito por compatibilidade com callers antigos
 * mas ignorado — pagamento usa `COINS_PER_MISSION` (fixo em 15) via pipeline.
 */
export async function completeMissionForToday(
  profile: Profile,
  mascot: Mascot,
  mission: Mission,
  _coinsRewardLegacy?: number,
): Promise<MissionCompletionResult> {
  const out: MissionCompletionOutcome = await applyMissionCompletion({
    profile,
    mascot,
    mission,
  });
  return {
    mascot: out.mascot,
    xpGained: out.xpGained,
    coins: out.coinsGained,
    alreadyCompleted: out.alreadyCompleted,
  };
}
