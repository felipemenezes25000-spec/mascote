/**
 * Persistência do estado de vida simulada (AsyncStorage).
 */

import type { LifeState } from '@/sim/types';
import { read, write, withLock } from './internal';
import AsyncStorage from '@react-native-async-storage/async-storage';

function fresh(user_id: string): LifeState {
  const now = new Date().toISOString();
  return {
    user_id,
    energy: 80,
    mood: 'ok',
    last_simulated_at: now,
    absence_hours: 0,
    total_simulated_hours: 0,
  };
}

export const mascotLife = {
  async get(user_id: string): Promise<LifeState | null> {
    const rows = await read<LifeState>('mascot_life');
    return rows.find(r => r.user_id === user_id) ?? null;
  },

  async upsert(state: LifeState): Promise<LifeState> {
    return withLock('mascot_life', async () => {
      const rows = await read<LifeState>('mascot_life');
      const exists = rows.some(r => r.user_id === state.user_id);
      const next = exists
        ? rows.map(r => (r.user_id === state.user_id ? state : r))
        : [...rows, state];
      await write('mascot_life', next);
      await AsyncStorage.setItem(`mascote:life_state:${state.user_id}`, JSON.stringify(state));
      return state;
    });
  },

  async getOrFresh(user_id: string): Promise<LifeState> {
    const existing = await this.get(user_id);
    return existing ?? fresh(user_id);
  },
};
