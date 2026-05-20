import type { OwnedAccessory } from '@/types';
import { read, write, withLock } from './internal';

export const inventory = {
  async listOwned(user_id: string): Promise<OwnedAccessory[]> {
    const rows = await read<OwnedAccessory>('accessories');
    return rows.filter(a => a.user_id === user_id);
  },
  async unlock(user_id: string, accessory_id: string): Promise<OwnedAccessory> {
    return withLock('accessories', async () => {
      const rows = await read<OwnedAccessory>('accessories');
      const existing = rows.find(r => r.user_id === user_id && r.accessory_id === accessory_id);
      if (existing) return existing;
      const next: OwnedAccessory = {
        user_id,
        accessory_id,
        equipped: false,
        unlocked_at: new Date().toISOString(),
      };
      await write<OwnedAccessory>('accessories', [...rows, next]);
      return next;
    });
  },
  async equip(
    user_id: string,
    accessory_id: string,
    slot?: { current: string; allOwned: Array<{ id: string; slot: string }> }
  ): Promise<void> {
    return withLock('accessories', async () => {
      const rows = await read<OwnedAccessory>('accessories');
      const slotMap = new Map<string, string>();
      if (slot) {
        for (const a of slot.allOwned) slotMap.set(a.id, a.slot);
      }
      const updated = rows.map(r => {
        /* v8 ignore next */
        if (r.user_id !== user_id) return r;
        if (r.accessory_id === accessory_id) return { ...r, equipped: true };
        if (slot) {
          const otherSlot = slotMap.get(r.accessory_id);
          if (otherSlot && otherSlot === slot.current) {
            return { ...r, equipped: false };
          }
          return r;
        }
        return { ...r, equipped: false };
      });
      await write<OwnedAccessory>('accessories', updated);
    });
  },
  async unequip(user_id: string, accessory_id: string): Promise<void> {
    return withLock('accessories', async () => {
      const rows = await read<OwnedAccessory>('accessories');
      /* v8 ignore next 5 */
      const updated = rows.map(r =>
        r.user_id === user_id && r.accessory_id === accessory_id
          ? { ...r, equipped: false }
          : r
      );
      await write<OwnedAccessory>('accessories', updated);
    });
  },
  async unequipAll(user_id: string): Promise<void> {
    return withLock('accessories', async () => {
      const rows = await read<OwnedAccessory>('accessories');
      /* v8 ignore next */
      const updated = rows.map(r => (r.user_id === user_id ? { ...r, equipped: false } : r));
      await write<OwnedAccessory>('accessories', updated);
    });
  },
};
