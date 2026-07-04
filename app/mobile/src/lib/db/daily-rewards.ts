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

// current_day vem de storage/import e alimenta a UI (useHomeBootstrap) e a
// aritmética de +1/clamp abaixo. Import corrompido ou edição manual pode trazer
// NaN/Infinity/negativo/fracionário, que envenena a comparação (`NaN >= 7` é
// false → `NaN + 1` = NaN persiste na UI) e o ciclo de 7 dias. Sanitiza pro
// intervalo válido [1,7] antes de qualquer uso — mesma defesa do wallet/genoma.
function safeCurrentDay(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return Math.min(7, Math.max(1, Math.floor(value)));
}

export function predictNextDailyRewardDay(
  state: { last_claimed_date: string | null; current_day: number },
  today: string
): number {
  const current = safeCurrentDay(state.current_day);
  if (state.last_claimed_date === today) return current;
  if (!state.last_claimed_date) return 1;
  const diff = daysBetween(state.last_claimed_date, today);
  if (diff === 1) return current >= 7 ? 1 : current + 1;
  if (diff > 1) return 1;
  return current;
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
      const currentDay = safeCurrentDay(current.current_day);
      let nextDay = currentDay;
      if (current.last_claimed_date) {
        const diff = daysBetween(current.last_claimed_date, today);
        if (diff === 1) {
          nextDay = currentDay >= 7 ? 1 : currentDay + 1;
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
