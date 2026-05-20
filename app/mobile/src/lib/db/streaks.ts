import type { Streak } from '@/types';
import { read, write, withLock } from './internal';

function freshStreak(user_id: string): Streak {
  return {
    user_id,
    current_streak: 0,
    longest_streak: 0,
    last_active_date: null,
    grace_days_left: 2,
    updated_at: new Date().toISOString(),
  };
}

async function streaksUpsertCore(s: Streak): Promise<void> {
  const rows = await read<Streak>('streaks');
  const exists = rows.some(r => r.user_id === s.user_id);
  const next = { ...s, updated_at: new Date().toISOString() };
  /* v8 ignore next 3 */
  await write<Streak>(
    'streaks',
    exists ? rows.map(r => (r.user_id === s.user_id ? next : r)) : [...rows, next]
  );
}

export const streaks = {
  async get(user_id: string): Promise<Streak> {
    const rows = await read<Streak>('streaks');
    return rows.find(s => s.user_id === user_id) ?? freshStreak(user_id);
  },
  async upsert(s: Streak): Promise<void> {
    return withLock('streaks', () => streaksUpsertCore(s));
  },
  async upsertNoLock(s: Streak): Promise<void> {
    return streaksUpsertCore(s);
  },
};
