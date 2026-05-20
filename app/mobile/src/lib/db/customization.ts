import type { MascotCustomization } from '@/types';
import { read, write, withLock } from './internal';

function freshCustomization(user_id: string): MascotCustomization {
  return {
    user_id,
    eye_size: 1,
    eye_spread: 1,
    body_height: 1,
    body_width: 1,
    aura_intensity: 1,
    pattern_density: 1,
    preferred_pattern: 'plain',
    posture_lean: 0,
    force_hide_tail: false,
    force_hide_antennae: false,
    force_hide_spikes: false,
    updated_at: new Date().toISOString(),
  };
}

export const customization = {
  async get(user_id: string): Promise<MascotCustomization> {
    const rows = await read<MascotCustomization>('customization');
    return rows.find(c => c.user_id === user_id) ?? freshCustomization(user_id);
  },
  async update(
    user_id: string,
    patch: Partial<Omit<MascotCustomization, 'user_id' | 'updated_at'>>,
  ): Promise<MascotCustomization> {
    return withLock('customization', async () => {
      const rows = await read<MascotCustomization>('customization');
      const existing = rows.find(c => c.user_id === user_id) ?? freshCustomization(user_id);
      const next: MascotCustomization = {
        ...existing,
        ...patch,
        user_id,
        updated_at: new Date().toISOString(),
      };
      const exists = rows.some(c => c.user_id === user_id);
      const newRows = exists
        ? rows.map(c => (c.user_id === user_id ? next : c))
        : [...rows, next];
      await write<MascotCustomization>('customization', newRows);
      return next;
    });
  },
  async reset(user_id: string): Promise<MascotCustomization> {
    return customization.update(user_id, {
      eye_size: 1,
      eye_spread: 1,
      body_height: 1,
      body_width: 1,
      aura_intensity: 1,
      pattern_density: 1,
      preferred_pattern: 'plain',
      posture_lean: 0,
      force_hide_tail: false,
      force_hide_antennae: false,
      force_hide_spikes: false,
    });
  },
};
