import type { Achievement } from '@/types';
import { read, write, withLock } from './internal';

export const achievements = {
  async listUnlocked(user_id: string): Promise<Achievement[]> {
    const rows = await read<Achievement>('achievements');
    return rows.filter(a => a.user_id === user_id);
  },
  async unlock(user_id: string, achievement_id: string): Promise<Achievement | null> {
    return withLock('achievements', async () => {
      const rows = await read<Achievement>('achievements');
      if (rows.some(a => a.user_id === user_id && a.achievement_id === achievement_id)) return null;
      const next: Achievement = {
        user_id,
        achievement_id,
        unlocked_at: new Date().toISOString(),
      };
      await write<Achievement>('achievements', [...rows, next]);
      return next;
    });
  },
};
