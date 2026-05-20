import type { XpEvent } from '@/types';
import { read, write, withLock, uid } from './internal';

export const xpEvents = {
  async add(e: Omit<XpEvent, 'id' | 'created_at'>): Promise<void> {
    return withLock('xp_events', async () => {
      const rows = await read<XpEvent>('xp_events');
      const next: XpEvent = { ...e, id: uid('x_'), created_at: new Date().toISOString() };
      await write<XpEvent>('xp_events', [...rows, next]);
    });
  },
  async total(user_id: string): Promise<number> {
    const rows = await read<XpEvent>('xp_events');
    return rows.filter(e => e.user_id === user_id).reduce((sum, e) => sum + e.amount, 0);
  },
};
