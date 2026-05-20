import type { OwnedScene } from '@/types';
import { read, write, withLock, normalizeSceneId } from './internal';

async function readScenes(): Promise<OwnedScene[]> {
  const rows = await read<OwnedScene>('scenes');
  let dirty = false;
  const migrated = rows.map(r => {
    const newId = normalizeSceneId(r.scene_id);
    if (newId !== r.scene_id) {
      dirty = true;
      return { ...r, scene_id: newId };
    }
    return r;
  });
  if (dirty) {
    const seen = new Map<string, OwnedScene>();
    for (const r of migrated) {
      const key = `${r.user_id}|${r.scene_id}`;
      const prev = seen.get(key);
      if (!prev) seen.set(key, r);
      else seen.set(key, { ...prev, active: prev.active || r.active });
    }
    const deduped = Array.from(seen.values());
    await write<OwnedScene>('scenes', deduped);
    return deduped;
  }
  return migrated;
}

export const userScenes = {
  async listUnlocked(user_id: string): Promise<OwnedScene[]> {
    const rows = await readScenes();
    return rows.filter(s => s.user_id === user_id);
  },
  async unlock(user_id: string, scene_id: string): Promise<OwnedScene> {
    const id = normalizeSceneId(scene_id);
    return withLock('scenes', async () => {
      const rows = await readScenes();
      const existing = rows.find(r => r.user_id === user_id && r.scene_id === id);
      if (existing) return existing;
      const next: OwnedScene = {
        user_id,
        scene_id: id,
        active: false,
        unlocked_at: new Date().toISOString(),
      };
      await write<OwnedScene>('scenes', [...rows, next]);
      return next;
    });
  },
  async setActive(user_id: string, scene_id: string): Promise<void> {
    const id = normalizeSceneId(scene_id);
    return withLock('scenes', async () => {
      const rows = await readScenes();
      const updated = rows.map(r => {
        /* v8 ignore next */
        if (r.user_id !== user_id) return r;
        return { ...r, active: r.scene_id === id };
      });
      await write<OwnedScene>('scenes', updated);
    });
  },
  async getActive(user_id: string): Promise<string> {
    const rows = await readScenes();
    const active = rows.find(r => r.user_id === user_id && r.active);
    return active?.scene_id ?? 'room';
  },
};
