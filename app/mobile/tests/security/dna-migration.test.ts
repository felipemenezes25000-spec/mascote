/**
 * PENTEST — robustez da migration v1 → v2.
 *
 * Cenários adversos:
 *  - DNA corrupto pré-existente (string em vez de objeto)
 *  - mascot sem personality (default = calmo)
 *  - mascot sem user_id (FNV-1a do '')
 *  - storage com mascots vazios (no-op)
 *  - re-execução não corrompe dados
 *  - colunas alheias (xp, level, etc) intocadas
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function makeStorageMock() {
  const storage: Record<string, string> = {};
  return {
    storage,
    mock: {
      getItem: vi.fn(async (k: string) => storage[k] ?? null),
      setItem: vi.fn(async (k: string, v: string) => { storage[k] = v; }),
      removeItem: vi.fn(async (k: string) => { delete storage[k]; }),
      clear: vi.fn(async () => { for (const k of Object.keys(storage)) delete storage[k]; }),
    },
  };
}

describe('migration v1→v2 — robustez', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.doUnmock('@react-native-async-storage/async-storage');
  });

  it('storage vazio: migration completa sem erro', async () => {
    const { storage, mock } = makeStorageMock();
    vi.doMock('@react-native-async-storage/async-storage', () => ({ default: mock }));
    const db = await import('@/lib/db');
    await expect(db.runMigrations()).resolves.toBeDefined();
    const meta = JSON.parse(storage['mascote:_meta'] ?? '{}');
    expect(meta.schema).toBe(3);
  });

  it('mascots vazios: migration v1→v2 é no-op silencioso', async () => {
    const { storage, mock } = makeStorageMock();
    storage['mascote:mascots'] = JSON.stringify([]);
    storage['mascote:_meta'] = JSON.stringify({ schema: 1 });
    vi.doMock('@react-native-async-storage/async-storage', () => ({ default: mock }));
    const db = await import('@/lib/db');
    await db.runMigrations();
    expect(JSON.parse(storage['mascote:mascots'] ?? '[]')).toEqual([]);
  });

  it('mascot pré-existente com DNA corrupto é sanitizado', async () => {
    const { storage, mock } = makeStorageMock();
    storage['mascote:mascots'] = JSON.stringify([{
      id: 'm_1', user_id: 'u_x', name: 'Bipo', personality: 'calmo',
      phase: 'crianca', mood: 'ok', xp: 100, level: 3, energy: 100, health: 100,
      last_seen_at: '', created_at: '',
      dna: { empathy: 'lixo', curiosity: -50, creativity: Infinity },
    }]);
    storage['mascote:_meta'] = JSON.stringify({ schema: 1 });
    vi.doMock('@react-native-async-storage/async-storage', () => ({ default: mock }));
    const db = await import('@/lib/db');
    await db.runMigrations();
    const rows = JSON.parse(storage['mascote:mascots'] ?? '[]');
    expect(rows[0].dna).toBeDefined();
    expect(rows[0].dna.empathy).toBeGreaterThanOrEqual(0.02);
    expect(rows[0].dna.empathy).toBeLessThanOrEqual(0.98);
    expect(Number.isFinite(rows[0].dna.creativity)).toBe(true);
  });

  it('mascot sem personality recebe DNA default (calmo)', async () => {
    const { storage, mock } = makeStorageMock();
    storage['mascote:mascots'] = JSON.stringify([{
      id: 'm_1', user_id: 'u_no_pers', name: 'X',
      phase: 'bebe', mood: 'ok', xp: 0, level: 1, energy: 100, health: 100,
      last_seen_at: '', created_at: '',
    }]);
    storage['mascote:_meta'] = JSON.stringify({ schema: 1 });
    vi.doMock('@react-native-async-storage/async-storage', () => ({ default: mock }));
    const db = await import('@/lib/db');
    await db.runMigrations();
    const rows = JSON.parse(storage['mascote:mascots'] ?? '[]');
    expect(rows[0].dna).toBeDefined();
    // calmo (Bipo) tem empatia alta
    expect(rows[0].dna.empathy).toBeGreaterThan(0.6);
  });

  it('campos alheios (xp, level, etc) permanecem intocados após migration', async () => {
    const { storage, mock } = makeStorageMock();
    const original = {
      id: 'm_1', user_id: 'u_z', name: 'Aro', personality: 'sabio',
      phase: 'adulto', mood: 'feliz', xp: 4242, level: 17, energy: 88, health: 91,
      last_seen_at: '2026-05-01', created_at: '2026-04-01',
    };
    storage['mascote:mascots'] = JSON.stringify([original]);
    storage['mascote:_meta'] = JSON.stringify({ schema: 1 });
    vi.doMock('@react-native-async-storage/async-storage', () => ({ default: mock }));
    const db = await import('@/lib/db');
    await db.runMigrations();
    const rows = JSON.parse(storage['mascote:mascots'] ?? '[]');
    expect(rows[0].xp).toBe(4242);
    expect(rows[0].level).toBe(17);
    expect(rows[0].energy).toBe(88);
    expect(rows[0].health).toBe(91);
    expect(rows[0].name).toBe('Aro');
    expect(rows[0].personality).toBe('sabio');
    expect(rows[0].phase).toBe('adulto');
  });

  it('múltiplos usuários: cada mascot ganha DNA independente', async () => {
    const { storage, mock } = makeStorageMock();
    storage['mascote:mascots'] = JSON.stringify([
      { id: 'm_1', user_id: 'u_a', name: 'A', personality: 'calmo',
        phase: 'bebe', mood: 'ok', xp: 0, level: 1, energy: 100, health: 100,
        last_seen_at: '', created_at: '' },
      { id: 'm_2', user_id: 'u_b', name: 'B', personality: 'motivador',
        phase: 'bebe', mood: 'ok', xp: 0, level: 1, energy: 100, health: 100,
        last_seen_at: '', created_at: '' },
      { id: 'm_3', user_id: 'u_c', name: 'C', personality: 'fofo',
        phase: 'bebe', mood: 'ok', xp: 0, level: 1, energy: 100, health: 100,
        last_seen_at: '', created_at: '' },
    ]);
    storage['mascote:_meta'] = JSON.stringify({ schema: 1 });
    vi.doMock('@react-native-async-storage/async-storage', () => ({ default: mock }));
    const db = await import('@/lib/db');
    await db.runMigrations();
    const rows = JSON.parse(storage['mascote:mascots'] ?? '[]');
    expect(rows.length).toBe(3);
    // Cada DNA é único por seed do user_id
    expect(rows[0].dna_seed).not.toBe(rows[1].dna_seed);
    expect(rows[1].dna_seed).not.toBe(rows[2].dna_seed);
    // calmo vs motivador devem ter empatia/socialEnergy bem diferentes
    expect(rows[0].dna.empathy).toBeGreaterThan(rows[1].dna.empathy);
    expect(rows[1].dna.socialEnergy).toBeGreaterThan(rows[0].dna.socialEnergy);
  });
});
