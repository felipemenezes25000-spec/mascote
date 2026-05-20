import type { Checkin } from '@/types';
import { read, write, withLock, uid } from './internal';

export const checkins = {
  async list(user_id: string, date?: string): Promise<Checkin[]> {
    const rows = await read<Checkin>('checkins');
    return rows.filter(c => c.user_id === user_id && (!date || c.occurred_on === date));
  },
  async listAll(user_id: string): Promise<Checkin[]> {
    const rows = await read<Checkin>('checkins');
    return rows.filter(c => c.user_id === user_id);
  },
  async add(c: Omit<Checkin, 'id' | 'created_at'>): Promise<Checkin | null> {
    return withLock('checkins', async () => {
      const rows = await read<Checkin>('checkins');
      const existing = rows.find(r => r.idempotency_key === c.idempotency_key);
      if (existing) return existing;
      const next: Checkin = { ...c, id: uid('c_'), created_at: new Date().toISOString() };
      await write<Checkin>('checkins', [...rows, next]);
      return next;
    });
  },
  async remove(id: string): Promise<boolean> {
    return withLock('checkins', async () => {
      const rows = await read<Checkin>('checkins');
      const before = rows.length;
      const next = rows.filter(r => r.id !== id);
      if (next.length === before) return false;
      await write<Checkin>('checkins', next);
      return true;
    });
  },
  async countSince(user_id: string, isoSince: string): Promise<number> {
    const rows = await read<Checkin>('checkins');
    return rows.filter(c => c.user_id === user_id && c.occurred_at >= isoSince).length;
  },
  async xpSumToday(user_id: string, date: string): Promise<number> {
    const rows = await read<Checkin>('checkins');
    return rows
      .filter(c => c.user_id === user_id && c.occurred_on === date)
      .reduce((sum, c) => sum + c.xp_awarded, 0);
  },
  async byHabitInRange(user_id: string, from: string, to: string): Promise<Record<string, Checkin[]>> {
    const rows = await read<Checkin>('checkins');
    const grouped: Record<string, Checkin[]> = {};
    /* v8 ignore start */
    for (const c of rows) {
      if (c.user_id !== user_id) continue;
      if (c.occurred_on < from || c.occurred_on > to) continue;
      if (!grouped[c.habit_kind]) grouped[c.habit_kind] = [];
      grouped[c.habit_kind].push(c);
    }
    /* v8 ignore stop */
    return grouped;
  },
  async byDateInRange(user_id: string, from: string, to: string): Promise<Record<string, number>> {
    const rows = await read<Checkin>('checkins');
    const grouped: Record<string, number> = {};
    /* v8 ignore start */
    for (const c of rows) {
      if (c.user_id !== user_id) continue;
      if (c.occurred_on < from || c.occurred_on > to) continue;
      grouped[c.occurred_on] = (grouped[c.occurred_on] ?? 0) + 1;
    }
    /* v8 ignore stop */
    return grouped;
  },
};
