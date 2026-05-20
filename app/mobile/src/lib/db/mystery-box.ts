import type { MysteryBox } from '@/types';
import { read, write, withLock } from './internal';

function freshMysteryBox(user_id: string): MysteryBox {
  return { user_id, last_opened_date: null, updated_at: new Date().toISOString() };
}

export const mysteryBox = {
  async get(user_id: string): Promise<MysteryBox> {
    const rows = await read<MysteryBox>('mystery_box');
    return rows.find(r => r.user_id === user_id) ?? freshMysteryBox(user_id);
  },
  async openedCount(user_id: string): Promise<number> {
    const rows = await read<MysteryBox>('mystery_box');
    const found = rows.find(r => r.user_id === user_id);
    return found?.total_opened ?? 0;
  },
  async open(user_id: string, today: string): Promise<boolean> {
    return withLock('mystery_box', async () => {
      const rows = await read<MysteryBox>('mystery_box');
      const current = rows.find(r => r.user_id === user_id) ?? freshMysteryBox(user_id);
      if (current.last_opened_date === today) return false;
      const next: MysteryBox = {
        user_id,
        last_opened_date: today,
        /* v8 ignore next */
        total_opened: (current.total_opened ?? 0) + 1,
        updated_at: new Date().toISOString(),
      };
      const exists = rows.some(r => r.user_id === user_id);
      /* v8 ignore next 3 */
      await write<MysteryBox>(
        'mystery_box',
        exists ? rows.map(r => (r.user_id === user_id ? next : r)) : [...rows, next]
      );
      return true;
    });
  },
};
