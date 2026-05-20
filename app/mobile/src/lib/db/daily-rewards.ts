import type { DailyReward } from '@/types';
import { read, write, withLock } from './internal';
import { daysBetween } from './dates';

function freshDailyReward(user_id: string): DailyReward {
  return {
    user_id,
    last_claimed_date: null,
    current_day: 1,
    updated_at: new Date().toISOString(),
  };
}

export function predictNextDailyRewardDay(
  state: { last_claimed_date: string | null; current_day: number },
  today: string
): number {
  if (state.last_claimed_date === today) return state.current_day;
  if (!state.last_claimed_date) return 1;
  const diff = daysBetween(state.last_claimed_date, today);
  if (diff === 1) return state.current_day >= 7 ? 1 : state.current_day + 1;
  if (diff > 1) return 1;
  return state.current_day;
}

export const dailyReward = {
  async get(user_id: string): Promise<DailyReward> {
    const rows = await read<DailyReward>('daily_reward');
    return rows.find(r => r.user_id === user_id) ?? freshDailyReward(user_id);
  },
  async claim(user_id: string, today: string): Promise<DailyReward | null> {
    return withLock('daily_reward', async () => {
      const rows = await read<DailyReward>('daily_reward');
      const current = rows.find(r => r.user_id === user_id) ?? freshDailyReward(user_id);
      if (current.last_claimed_date === today) return null;
      let nextDay = current.current_day;
      if (current.last_claimed_date) {
        const diff = daysBetween(current.last_claimed_date, today);
        if (diff === 1) {
          nextDay = current.current_day >= 7 ? 1 : current.current_day + 1;
        } else if (diff > 1) {
          nextDay = 1;
        }
      } else {
        nextDay = 1;
      }
      const next: DailyReward = {
        user_id,
        last_claimed_date: today,
        current_day: nextDay,
        updated_at: new Date().toISOString(),
      };
      const exists = rows.some(r => r.user_id === user_id);
      /* v8 ignore next */
      await write<DailyReward>(
        'daily_reward',
        exists ? rows.map(r => (r.user_id === user_id ? next : r)) : [...rows, next]
      );
      return next;
    });
  },
};
