import type { Settings } from '@/types';
import { read, write, withLock } from './internal';

function freshSettings(user_id: string): Settings {
  return {
    user_id,
    theme_mode: 'system',
    brand_palette: 'classic',
    dynamic_text: true,
    reduce_motion: false,
    high_contrast: false,
    push_enabled: true,
    quiet_start: '22:00',
    quiet_end: '08:00',
    paused_until: null,
    language: 'pt-BR',
    consent_analytics: false,
    tour_completed: false,
  };
}

export const settings = {
  async hasPersisted(user_id: string): Promise<boolean> {
    const rows = await read<Settings>('settings');
    return rows.some(s => s.user_id === user_id);
  },
  async get(user_id: string): Promise<Settings> {
    const rows = await read<Settings>('settings');
    return rows.find(s => s.user_id === user_id) ?? freshSettings(user_id);
  },
  async update(user_id: string, patch: Partial<Settings>): Promise<Settings> {
    return withLock('settings', async () => {
      const rows = await read<Settings>('settings');
      /* v8 ignore next */
      const existing = rows.find(r => r.user_id === user_id) ?? freshSettings(user_id);
      const next: Settings = { ...existing, ...patch, user_id };
      /* v8 ignore next 3 */
      const newRows = rows.some(r => r.user_id === user_id)
        ? rows.map(r => (r.user_id === user_id ? next : r))
        : [...rows, next];
      await write<Settings>('settings', newRows);
      return next;
    });
  },
};
