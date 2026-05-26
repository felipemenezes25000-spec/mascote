import type { OwnedScene } from '@/types';
import { read, write, withLock, normalizeSceneId } from './internal';

/**
 * Lê + normaliza scene_id legados sem adquirir lock. Usar SEMPRE dentro de
 * `withLock('scenes', ...)`. Sem essa separação, callsites como `unlock` que
 * já estavam no lock chamavam `readScenes()` (com lock) e deadlockavam: a call
 * interna pegaria a Promise externa ainda pendente como `prev` no `withLock`,
 * que só resolve depois dela mesma — wait-cycle clássico (internal.ts:85-97).
 */
async function readScenesNoLock(): Promise<{ rows: OwnedScene[]; dirty: boolean }> {
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
  return { rows: migrated, dirty };
}

function dedupeScenes(rows: OwnedScene[]): OwnedScene[] {
  const seen = new Map<string, OwnedScene>();
  for (const r of rows) {
    const key = `${r.user_id}|${r.scene_id}`;
    const prev = seen.get(key);
    if (!prev) seen.set(key, r);
    else seen.set(key, { ...prev, active: prev.active || r.active });
  }
  return Array.from(seen.values());
}

async function readScenes(): Promise<OwnedScene[]> {
  const { rows, dirty } = await readScenesNoLock();
  if (!dirty) return rows;
  // Migração de cena legada: pega o lock, re-lê fresh, deduplica e grava.
  return withLock('scenes', async () => {
    const fresh = await readScenesNoLock();
    const deduped = dedupeScenes(fresh.rows);
    await write<OwnedScene>('scenes', deduped);
    return deduped;
  });
}

export const userScenes = {
  async listUnlocked(user_id: string): Promise<OwnedScene[]> {
    const rows = await readScenes();
    return rows.filter(s => s.user_id === user_id);
  },
  async unlock(user_id: string, scene_id: string): Promise<OwnedScene> {
    const id = normalizeSceneId(scene_id);
    return withLock('scenes', async () => {
      const { rows } = await readScenesNoLock();
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
      const { rows } = await readScenesNoLock();
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
