import type { Profile } from '@/types';
import { read, write, withLock, uid } from './internal';

export const profiles = {
  async get(): Promise<Profile | null> {
    const rows = await read<Profile>('profiles');
    return rows[0] ?? null;
  },
  async upsert(p: Partial<Profile> & { display_name: string }): Promise<Profile> {
    return withLock('profiles', async () => {
      const rows = await read<Profile>('profiles');
      const existing = rows[0] ?? null;
      const next: Profile = {
        id: existing?.id ?? uid('u_'),
        display_name: p.display_name,
        age_band: p.age_band ?? existing?.age_band ?? null,
        timezone: p.timezone ?? existing?.timezone ?? 'America/Sao_Paulo',
        locale: p.locale ?? existing?.locale ?? 'pt-BR',
        created_at: existing?.created_at ?? new Date().toISOString(),
      };
      await write<Profile>('profiles', [next]);
      return next;
    });
  },
  async clear(): Promise<void> {
    return withLock('profiles', async () => {
      await write<Profile>('profiles', []);
    });
  },
};
