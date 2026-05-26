/**
 * Tests da migration v5 -> v6: backfill is_auto em atelier_looks.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, readMeta, runMigrations } from '@/lib/db/migrations';

const ATELIER_LOOKS_KEY = 'mascote:atelier_looks';
const META_KEY = 'mascote:_meta';

async function seedLooks(rows: unknown[]): Promise<void> {
  await AsyncStorage.setItem(ATELIER_LOOKS_KEY, JSON.stringify(rows));
}

async function readLooks(): Promise<Array<Record<string, unknown>>> {
  const raw = await AsyncStorage.getItem(ATELIER_LOOKS_KEY);
  return raw ? JSON.parse(raw) : [];
}

describe('migration v5 -> v6: backfill atelier_looks.is_auto', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('row legada sem is_auto recebe false', async () => {
    await seedLooks([
      { id: 'l1', user_id: 'u', name: 'meu look', customization: {}, created_at: '2026-01-01' },
    ]);
    await AsyncStorage.setItem(META_KEY, JSON.stringify({ schema: 5 }));
    await runMigrations();
    const rows = await readLooks();
    expect(rows).toHaveLength(1);
    expect(rows[0].is_auto).toBe(false);
  });

  it('row com is_auto explicito eh preservada', async () => {
    await seedLooks([
      { id: 'a', is_auto: true, name: 'auto', customization: {} },
      { id: 'b', is_auto: false, name: 'manual', customization: {} },
      { id: 'c', name: 'legado', customization: {} },
    ]);
    await AsyncStorage.setItem(META_KEY, JSON.stringify({ schema: 5 }));
    await runMigrations();
    const rows = await readLooks();
    const byId = Object.fromEntries(rows.map(r => [r.id, r.is_auto]));
    expect(byId.a).toBe(true);
    expect(byId.b).toBe(false);
    expect(byId.c).toBe(false);
  });

  it('empty table no-op', async () => {
    await seedLooks([]);
    await AsyncStorage.setItem(META_KEY, JSON.stringify({ schema: 5 }));
    await runMigrations();
    const rows = await readLooks();
    expect(rows).toHaveLength(0);
  });

  it('idempotente', async () => {
    await seedLooks([{ id: 'x', name: 'x', customization: {} }]);
    await AsyncStorage.setItem(META_KEY, JSON.stringify({ schema: 5 }));
    await runMigrations();
    const first = await readLooks();
    await AsyncStorage.setItem(META_KEY, JSON.stringify({ schema: 5 }));
    await runMigrations();
    const second = await readLooks();
    expect(second).toEqual(first);
  });

  it('schema final bate com CURRENT_SCHEMA_VERSION', async () => {
    await seedLooks([]);
    await runMigrations();
    const meta = await readMeta();
    expect(meta.schema).toBe(CURRENT_SCHEMA_VERSION);
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(6);
  });
});
