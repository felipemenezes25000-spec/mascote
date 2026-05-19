/**
 * Catálogo de acessórios — itens cosméticos desbloqueáveis.
 *
 * Invariantes:
 * - IDs únicos (sem duplicação).
 * - Slots válidos.
 * - Unlock kind: level, streak, mission_count, seasonal.
 * - `checkUnlock` é puro e determinístico.
 */

import { describe, expect, it } from 'vitest';
import {
  accessoryCatalog,
  checkUnlock,
  getAccessory,
  type AccessoryMeta,
} from '@/content/accessories';

describe('accessoryCatalog', () => {
  it('catálogo não-vazio', () => {
    expect(accessoryCatalog.length).toBeGreaterThan(0);
  });

  it('todos têm ids únicos', () => {
    const ids = accessoryCatalog.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todos têm name, emoji e description não-vazios', () => {
    for (const a of accessoryCatalog) {
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.emoji.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
    }
  });

  it('todos têm unlock.label', () => {
    for (const a of accessoryCatalog) {
      expect(a.unlock.label.length).toBeGreaterThan(0);
    }
  });

  it('slots são valores válidos', () => {
    const valid = new Set(['hat', 'glasses', 'neck', 'back', 'ear']);
    for (const a of accessoryCatalog) {
      expect(valid.has(a.slot)).toBe(true);
    }
  });

  it('todos os unlock.kind são suportados', () => {
    const valid = new Set(['level', 'streak', 'phase', 'mission_count', 'seasonal']);
    for (const a of accessoryCatalog) {
      expect(valid.has(a.unlock.kind)).toBe(true);
    }
  });

  it('unlock.value são positivos', () => {
    for (const a of accessoryCatalog) {
      expect(a.unlock.value).toBeGreaterThan(0);
    }
  });
});

describe('getAccessory', () => {
  it('retorna acessório existente', () => {
    expect(getAccessory('cap')?.id).toBe('cap');
  });
  it('retorna undefined em id inexistente', () => {
    expect(getAccessory('inexistente_xyz')).toBeUndefined();
  });
});

describe('checkUnlock — level', () => {
  const cap = accessoryCatalog.find(a => a.id === 'cap')!;
  it('level >= 2 desbloqueia cap', () => {
    expect(checkUnlock(cap, { level: 2, currentStreak: 0, longestStreak: 0 })).toBe(true);
    expect(checkUnlock(cap, { level: 10, currentStreak: 0, longestStreak: 0 })).toBe(true);
  });
  it('level < 2 NÃO desbloqueia', () => {
    expect(checkUnlock(cap, { level: 1, currentStreak: 0, longestStreak: 0 })).toBe(false);
  });
});

describe('checkUnlock — streak', () => {
  const scarf = accessoryCatalog.find(a => a.id === 'scarf')!;
  it('current_streak >= 7 desbloqueia', () => {
    expect(checkUnlock(scarf, { level: 1, currentStreak: 7, longestStreak: 0 })).toBe(true);
  });
  it('longest_streak >= 7 desbloqueia (mesmo se current < 7)', () => {
    expect(checkUnlock(scarf, { level: 1, currentStreak: 0, longestStreak: 7 })).toBe(true);
  });
  it('ambos < 7 NÃO desbloqueia', () => {
    expect(checkUnlock(scarf, { level: 1, currentStreak: 6, longestStreak: 6 })).toBe(false);
  });
});

describe('checkUnlock — mission_count', () => {
  const cookie = accessoryCatalog.find(a => a.id === 'cookie')!;
  it('totalCheckins >= 100 desbloqueia', () => {
    expect(checkUnlock(cookie, { level: 1, currentStreak: 0, longestStreak: 0, totalCheckins: 100 })).toBe(true);
  });
  it('totalCheckins < 100 NÃO desbloqueia', () => {
    expect(checkUnlock(cookie, { level: 1, currentStreak: 0, longestStreak: 0, totalCheckins: 99 })).toBe(false);
  });
  it('totalCheckins undefined → trata como 0', () => {
    expect(checkUnlock(cookie, { level: 1, currentStreak: 0, longestStreak: 0 })).toBe(false);
  });
});

describe('checkUnlock — seasonal', () => {
  const leaf = accessoryCatalog.find(a => a.id === 'leaf')!;
  it('activeSeasonalMonth === unlock.value (mês de outono = 4) desbloqueia', () => {
    expect(
      checkUnlock(leaf, { level: 1, currentStreak: 0, longestStreak: 0, activeSeasonalMonth: 4 })
    ).toBe(true);
  });
  it('mês errado NÃO desbloqueia', () => {
    expect(
      checkUnlock(leaf, { level: 1, currentStreak: 0, longestStreak: 0, activeSeasonalMonth: 6 })
    ).toBe(false);
  });
  it('sem activeSeasonalMonth NÃO desbloqueia', () => {
    expect(checkUnlock(leaf, { level: 1, currentStreak: 0, longestStreak: 0 })).toBe(false);
  });
});

describe('checkUnlock — phase (não usado)', () => {
  it('retorna false (preservar switch exaustivo)', () => {
    const synthetic: AccessoryMeta = {
      id: 'cap',
      name: 'X',
      slot: 'hat',
      emoji: 'x',
      description: 'y',
      unlock: { kind: 'phase', value: 1, label: 'phase' },
    };
    expect(checkUnlock(synthetic, { level: 99, currentStreak: 99, longestStreak: 99 })).toBe(false);
  });
});

describe('checkUnlock — default branch (kind invalid)', () => {
  it('retorna false em kind desconhecido', () => {
    const malformed: AccessoryMeta = {
      id: 'cap',
      name: 'X',
      slot: 'hat',
      emoji: 'x',
      description: 'y',
      unlock: { kind: 'unknown' as any, value: 1, label: 'x' },
    };
    expect(checkUnlock(malformed, { level: 99, currentStreak: 99, longestStreak: 99 })).toBe(false);
  });
});

describe('premium accessories', () => {
  it('horn é premium', () => {
    expect(accessoryCatalog.find(a => a.id === 'horn')?.premium).toBe(true);
  });
  it('cap NÃO é premium', () => {
    expect(accessoryCatalog.find(a => a.id === 'cap')?.premium).toBeFalsy();
  });
});
