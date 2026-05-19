/**
 * Implementações locais dos repositórios.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BillingTierId } from '@/content/billing';
import { profiles, mascots, missions as missionsDb, achievements as achievementsDb } from '@/lib/db';
import { loadEvolutionState, saveEvolutionState } from '@/game/evolution/EvolutionPersistence';
import type {
  UserProfileRepository,
  MascotRepository,
  EvolutionRepository,
  MissionRepository,
  SubscriptionRepository,
  AchievementRepository,
  StoredPersonalization,
  PersonalizationRepository,
} from './types';

const SUB_KEY = (uid: string) => `mascote:subscription:${uid}`;
const PERSONALIZATION_KEY = (uid: string) => `mascote:personalization:${uid}`;

export const localUserProfileRepo: UserProfileRepository = {
  get: () => profiles.get(),
  save: async p => { await profiles.upsert(p); },
};

export const localMascotRepo: MascotRepository = {
  forUser: uid => mascots.forUser(uid),
  save: async m => { await mascots.upsert(m); },
};

export const localEvolutionRepo: EvolutionRepository = {
  load: uid => loadEvolutionState(uid),
  save: async (uid, data) => {
    await saveEvolutionState(uid, {
      microEvolutions: data.microEvolutions,
      microEvolutionLevel: data.microEvolutionLevel,
    });
  },
};

export const localMissionRepo: MissionRepository = {
  listForUser: uid => missionsDb.list(uid),
  save: async m => {
    await missionsDb.update(m.id, m);
  },
};

export const localAchievementRepo: AchievementRepository = {
  listForUser: uid => achievementsDb.listUnlocked(uid),
  unlock: async (uid, id) => {
    await achievementsDb.unlock(uid, id);
  },
};

export const localPersonalizationRepo: PersonalizationRepository = {
  async get(uid) {
    const raw = await AsyncStorage.getItem(PERSONALIZATION_KEY(uid));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredPersonalization;
    } catch {
      return null;
    }
  },
  async save(uid, data) {
    await AsyncStorage.setItem(PERSONALIZATION_KEY(uid), JSON.stringify(data));
  },
};

export const localSubscriptionRepo: SubscriptionRepository = {
  async getTier(uid) {
    const raw = await AsyncStorage.getItem(SUB_KEY(uid));
    if (!raw) return 'free';
    try {
      const parsed = JSON.parse(raw) as { tier?: string };
      if (parsed.tier === 'plus_monthly' || parsed.tier === 'plus_annual') return parsed.tier;
    } catch { /* ignore */ }
    return 'free';
  },
  async setTier(uid, tier: BillingTierId) {
    if (tier !== 'free' && tier !== 'plus_monthly' && tier !== 'plus_annual') return;
    await AsyncStorage.setItem(SUB_KEY(uid), JSON.stringify({ tier, updatedAt: new Date().toISOString() }));
  },
};
