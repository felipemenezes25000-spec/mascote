import type { Mission } from '@/types';
import { logger } from '@/lib/logger';
import { read, write, withLock, uid } from './internal';

export const missions = {
  async forDate(user_id: string, date: string): Promise<Mission[]> {
    const rows = await read<Mission>('missions');
    return rows.filter(m => m.user_id === user_id && m.scheduled_for === date);
  },
  async list(user_id: string): Promise<Mission[]> {
    const rows = await read<Mission>('missions');
    return rows.filter(m => m.user_id === user_id);
  },
  async add(m: Omit<Mission, 'id' | 'created_at'>): Promise<Mission> {
    return withLock('missions', async () => {
      const rows = await read<Mission>('missions');
      const next: Mission = { ...m, id: uid('ms_'), created_at: new Date().toISOString() };
      await write<Mission>('missions', [...rows, next]);
      return next;
    });
  },
  async update(id: string, patch: Partial<Mission>): Promise<void> {
    return withLock('missions', async () => {
      const rows = await read<Mission>('missions');
      // Sem este check, update(idInexistente) era no-op silencioso — caller
      // (applyMissionCompletion) assumia sucesso, atualizava mascot/xp, e a
      // missão ficava em estado inconsistente (DB sem mudança, app sem feedback).
      let found = false;
      const updated = rows.map(m => {
        if (m.id === id) {
          found = true;
          return { ...m, ...patch };
        }
        return m;
      });
      if (!found) {
        logger.warn('[db] mission not found for update', { id });
        return;
      }
      await write<Mission>('missions', updated);
    });
  },
};
