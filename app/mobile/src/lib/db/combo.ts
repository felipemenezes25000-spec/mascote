import type { Combo } from '@/types';
import { read, write, withLock } from './internal';

const COMBO_TIMEOUT_HOURS = 24;

function freshCombo(user_id: string): Combo {
  return {
    user_id,
    current: 1,
    last_action_at: null,
    updated_at: new Date().toISOString(),
  };
}

function decayCombo(c: Combo, now: Date = new Date()): Combo {
  if (!c.last_action_at) return c;
  const hoursSince = (now.getTime() - new Date(c.last_action_at).getTime()) / (1000 * 60 * 60);
  if (hoursSince > COMBO_TIMEOUT_HOURS && c.current > 1) {
    return { ...c, current: 1, updated_at: now.toISOString() };
  }
  return c;
}

export const combo = {
  async get(user_id: string): Promise<Combo> {
    const rows = await read<Combo>('combo');
    const found = rows.find(r => r.user_id === user_id) ?? freshCombo(user_id);
    return decayCombo(found);
  },
  async bump(user_id: string): Promise<Combo> {
    return withLock('combo', async () => {
      const rows = await read<Combo>('combo');
      const stored = rows.find(r => r.user_id === user_id) ?? freshCombo(user_id);
      const current = decayCombo(stored);
      const now = new Date();
      const last = current.last_action_at ? new Date(current.last_action_at) : null;
      const hoursSince = last ? (now.getTime() - last.getTime()) / (1000 * 60 * 60) : 0;
      let next = current.current;
      if (last && hoursSince > COMBO_TIMEOUT_HOURS) {
        next = 1;
      } else if (current.current < 5) {
        next = current.current + 1;
      }
      const updated: Combo = {
        user_id,
        current: next,
        last_action_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      /* v8 ignore next */
      const newRows = rows.some(r => r.user_id === user_id)
        ? rows.map(r => (r.user_id === user_id ? updated : r))
        : [...rows, updated];
      await write<Combo>('combo', newRows);
      return updated;
    });
  },
};

export function comboXpBonus(level: number): number {
  if (!Number.isFinite(level) || level < 1) return 0;
  return (level - 1) * 25;
}
