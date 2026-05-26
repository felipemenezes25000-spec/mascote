/**
 * Persistência do estado de vida simulada (AsyncStorage).
 */

import type { LifeState } from '@/sim/types';
import { read, write, withLock } from './internal';
import AsyncStorage from '@react-native-async-storage/async-storage';

function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

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
    // Sanitiza campos numéricos: simulação ou import com bug pode trazer
    // NaN/Infinity, que envenena toda comparação posterior (`energy < 20`
    // vira false pra NaN → mascote fica em mood errado para sempre).
    const sanitized: LifeState = {
      ...state,
      energy: clampNumber(state.energy, 0, 100, 80),
      absence_hours: clampNumber(state.absence_hours, 0, Number.MAX_SAFE_INTEGER, 0),
      total_simulated_hours: clampNumber(state.total_simulated_hours, 0, Number.MAX_SAFE_INTEGER, 0),
    };
    return withLock('mascot_life', async () => {
      const rows = await read<LifeState>('mascot_life');
      const exists = rows.some(r => r.user_id === sanitized.user_id);
      const next = exists
        ? rows.map(r => (r.user_id === sanitized.user_id ? sanitized : r))
        : [...rows, sanitized];
      await write('mascot_life', next);
      await AsyncStorage.setItem(`mascote:life_state:${sanitized.user_id}`, JSON.stringify(sanitized));
      return sanitized;
    });
  },

  async getOrFresh(user_id: string): Promise<LifeState> {
    const existing = await this.get(user_id);
    return existing ?? fresh(user_id);
  },
};
