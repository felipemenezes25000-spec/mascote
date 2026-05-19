/**
 * Sync local — export/import estendido (evolução, memória, assinatura, personalização).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadEvolutionState } from '@/game/evolution/EvolutionPersistence';
import { exportAll, importAll } from '@/lib/db';
import { localPersonalizationRepo, localSubscriptionRepo } from './local';
import type { SyncPayload, SyncPullResult, SyncRepository } from './sync';

const MEMORY_KEY = (uid: string) => `mascote:memory:${uid}`;
const MEMORY_TFIDF_KEY = (uid: string) => `mascote:memory_tfidf:${uid}`;

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const localSyncRepo: SyncRepository = {
  async exportSnapshot(userId: string): Promise<SyncPayload> {
    const tables = await exportAll(userId);
    const evolution = await loadEvolutionState(userId);
    const memory = await readJson<unknown[]>(MEMORY_KEY(userId));
    const memoryTfidf = await readJson<unknown>(MEMORY_TFIDF_KEY(userId));
    const tier = await localSubscriptionRepo.getTier(userId);
    const personalization = await localPersonalizationRepo.get(userId);

    return {
      userId,
      exportedAt: new Date().toISOString(),
      tables,
      evolution,
      memory,
      memoryTfidf,
      subscription: { tier },
      personalization,
    };
  },

  async importSnapshot(payload: SyncPayload): Promise<SyncPullResult> {
    const applied: string[] = [];
    const skipped: string[] = [];

    const tableResult = await importAll(payload.tables as Record<string, unknown[]>);
    applied.push(...tableResult.imported);
    skipped.push(...tableResult.skipped);

    const uid = payload.userId;

    if (payload.evolution) {
      await AsyncStorage.setItem(
        `mascote:evolution:${uid}`,
        JSON.stringify(payload.evolution),
      );
      applied.push('evolution');
    }

    if (Array.isArray(payload.memory)) {
      await AsyncStorage.setItem(MEMORY_KEY(uid), JSON.stringify(payload.memory));
      applied.push('memory');
    }

    if (payload.memoryTfidf != null) {
      await AsyncStorage.setItem(MEMORY_TFIDF_KEY(uid), JSON.stringify(payload.memoryTfidf));
      applied.push('memory_tfidf');
    }

    if (payload.subscription?.tier) {
      await localSubscriptionRepo.setTier(uid, payload.subscription.tier);
      applied.push('subscription');
    }

    if (payload.personalization) {
      await localPersonalizationRepo.save(uid, payload.personalization);
      applied.push('personalization');
    }

    return { applied, skipped };
  },

  async listPendingOps(_userId: string) {
    return [];
  },

  async ackOp() {
    /* local-only */
  },
};
