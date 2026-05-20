/**
 * useHomeBootstrap — orquestra todos os carregamentos da Home num único hook,
 * substituindo as 8 funções de loading espalhadas no `index.tsx`.
 *
 * Pode ser chamado:
 *  - 1x no mount via `useEffect`
 *  - sempre que a Home recebe foco via `useFocusEffect(reload)`
 *
 * Retorna um snapshot completo + `reload()` pra refresh sob demanda.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkins as checkinsDb,
  combo as comboDb,
  customization as customizationDb,
  dailyReward,
  dnaMutations,
  inventory,
  messages as messagesDb,
  mysteryBox,
  predictNextDailyRewardDay,
  settings as settingsDb,
  todayLocal,
  userScenes,
  addDays,
} from '@/lib/db';
import { deriveReflectiveMood } from '@/lib/mood';
import { entitlementService } from '@/services/subscription/EntitlementService';
import { accessoryCatalog } from '@/content/accessories';
import type { BillingTierId } from '@/content/billing';
import type { AccessoryId } from '@/components/Mascot';
import type {
  Mascot,
  MascotCustomization,
  MascotMood,
  Profile,
} from '@/types';

export interface HomeBootstrapSnapshot {
  todayCheckins: Record<string, number>;
  totalCheckinsAll: number;
  comboLevel: number;
  dailyCurrentDay: number;
  dailyClaimedToday: boolean;
  boxAvailable: boolean;
  unlockedSceneIds: string[];
  activeSceneId: string;
  equippedAccId: AccessoryId;
  customState: MascotCustomization | null;
  mutationIds: readonly string[];
  reflectiveMood: MascotMood | null;
  firstMissionPending: boolean;
}

const EMPTY: HomeBootstrapSnapshot = {
  todayCheckins: {},
  totalCheckinsAll: 0,
  comboLevel: 1,
  dailyCurrentDay: 1,
  dailyClaimedToday: false,
  boxAvailable: true,
  unlockedSceneIds: ['room'],
  activeSceneId: 'room',
  equippedAccId: 'none',
  customState: null,
  mutationIds: [],
  reflectiveMood: null,
  firstMissionPending: false,
};

interface Options {
  profile: Profile | null;
  mascot: Mascot | null;
  tier: BillingTierId;
}

export function useHomeBootstrap({ profile, mascot, tier }: Options) {
  const [snapshot, setSnapshot] = useState<HomeBootstrapSnapshot>(EMPTY);
  const lastProfileIdRef = useRef<string | null>(null);

  const reload = useCallback(async () => {
    if (!profile) {
      setSnapshot(EMPTY);
      return;
    }
    const today = todayLocal();
    const [
      todayCh,
      allCh,
      comboRow,
      dailyRow,
      boxRow,
      scenes,
      activeScene,
      accs,
      custom,
      mutations,
      settingsRow,
      messagesRecent,
    ] = await Promise.all([
      checkinsDb.list(profile.id, today),
      checkinsDb.listAll(profile.id),
      comboDb.get(profile.id),
      dailyReward.get(profile.id),
      mysteryBox.get(profile.id),
      userScenes.listUnlocked(profile.id),
      userScenes.getActive(profile.id),
      inventory.listOwned(profile.id),
      customizationDb.get(profile.id),
      dnaMutations.listForUser(profile.id),
      settingsDb.get(profile.id),
      messagesDb.listRecent(profile.id, 20),
    ]);

    const todayMap: Record<string, number> = {};
    for (const c of todayCh) {
      todayMap[c.habit_kind] = (todayMap[c.habit_kind] ?? 0) + (c.value ?? 1);
    }

    const equipped = accs.find(a => a.equipped);
    const equippedAccId: AccessoryId =
      equipped && accessoryCatalog.find(a => a.id === equipped.accessory_id)
        ? (equipped.accessory_id as AccessoryId)
        : 'none';

    const allowedScenes = scenes
      .map(s => s.scene_id)
      .filter(id => entitlementService.canAccessScene(tier, id));

    let reflectiveMood: MascotMood | null = null;
    if (mascot) {
      const cutoff = addDays(today, -7);
      const recentCh = allCh.filter(r => r.occurred_on >= cutoff);
      const lastCh = recentCh.map(c => new Date(c.occurred_at).getTime()).sort((a, b) => b - a)[0];
      const hoursSince = lastCh ? (Date.now() - lastCh) / 3_600_000 : 999;
      reflectiveMood = deriveReflectiveMood({
        baseMood: mascot.mood,
        recentMessages: messagesRecent,
        recentCheckins: recentCh,
        hoursSinceLastCheckin: hoursSince,
      });
    }

    setSnapshot({
      todayCheckins: todayMap,
      totalCheckinsAll: allCh.length,
      comboLevel: Math.max(1, Math.min(5, comboRow?.current ?? 1)),
      dailyCurrentDay: predictNextDailyRewardDay(dailyRow, today),
      dailyClaimedToday: dailyRow.last_claimed_date === today,
      boxAvailable: boxRow.last_opened_date !== today,
      unlockedSceneIds: allowedScenes.length > 0 ? allowedScenes : ['room'],
      activeSceneId: activeScene,
      equippedAccId,
      customState: custom,
      mutationIds: mutations.map(m => m.mutation_id),
      reflectiveMood,
      firstMissionPending: !!(settingsRow as { first_mission_pending?: boolean })
        .first_mission_pending,
    });
  }, [profile?.id, mascot, tier]);

  useEffect(() => {
    if (!profile) {
      setSnapshot(EMPTY);
      lastProfileIdRef.current = null;
      return;
    }
    if (lastProfileIdRef.current === profile.id) return;
    lastProfileIdRef.current = profile.id;
    void reload();
  }, [profile, reload]);

  return { snapshot, reload, setSnapshot };
}
