import type { InAppNotification } from '@/types';
import { read, write, withLock, uid } from './internal';

// Cap defensivo: in-app notifications acumulavam indefinidamente, inclusive
// já-lidas. Sem trim, `notify.ts` itera a lista inteira pra dedup por dia →
// O(n) por call, degrada com a vida do usuário. FIFO mantém 300.
const MAX_NOTIFICATIONS = 300;

export const notifications = {
  async list(user_id: string): Promise<InAppNotification[]> {
    const rows = await read<InAppNotification>('notifications');
    return rows.filter(n => n.user_id === user_id).sort((a, b) => (b.created_at).localeCompare(a.created_at));
  },
  async unreadCount(user_id: string): Promise<number> {
    const rows = await read<InAppNotification>('notifications');
    return rows.filter(n => n.user_id === user_id && !n.read_at).length;
  },
  async add(n: Omit<InAppNotification, 'id' | 'created_at'>): Promise<InAppNotification> {
    return withLock('notifications', async () => {
      const rows = await read<InAppNotification>('notifications');
      const next: InAppNotification = { ...n, id: uid('n_'), created_at: new Date().toISOString() };
      const combined = [...rows, next];
      const trimmed = combined.length > MAX_NOTIFICATIONS
        ? combined.slice(-MAX_NOTIFICATIONS)
        : combined;
      await write<InAppNotification>('notifications', trimmed);
      return next;
    });
  },
  async markRead(id: string, user_id?: string): Promise<void> {
    return withLock('notifications', async () => {
      const rows = await read<InAppNotification>('notifications');
      const now = new Date().toISOString();
      await write<InAppNotification>(
        'notifications',
        rows.map(n => {
          if (n.id !== id) return n;
          if (user_id && n.user_id !== user_id) return n;
          return { ...n, read_at: now };
        })
      );
    });
  },
  async markAllRead(user_id: string): Promise<void> {
    return withLock('notifications', async () => {
      const rows = await read<InAppNotification>('notifications');
      const now = new Date().toISOString();
      await write<InAppNotification>(
        'notifications',
        rows.map(n => (n.user_id === user_id && !n.read_at ? { ...n, read_at: now } : n))
      );
    });
  },
};
