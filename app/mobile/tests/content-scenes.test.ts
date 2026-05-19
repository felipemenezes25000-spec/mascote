/**
 * Catálogo de cenários (scenes) — backgrounds desbloqueáveis.
 */

import { describe, expect, it } from 'vitest';
import { checkSceneUnlock, getScene, scenesCatalog } from '@/content/scenes';

describe('scenesCatalog', () => {
  it('contém pelo menos 1 default', () => {
    const defaults = scenesCatalog.filter(s => s.isDefault);
    expect(defaults.length).toBeGreaterThan(0);
    expect(defaults[0].id).toBe('room');
  });

  it('ids únicos', () => {
    const ids = scenesCatalog.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('campos obrigatórios não-vazios', () => {
    for (const s of scenesCatalog) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.emoji.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
      expect(s.unlock.label.length).toBeGreaterThan(0);
    }
  });
});

describe('getScene', () => {
  it('retorna scene existente', () => {
    expect(getScene('forest').id).toBe('forest');
  });
  it('id inexistente → fallback pra primeiro (room)', () => {
    expect(getScene('xyz').id).toBe('room');
  });
});

describe('checkSceneUnlock', () => {
  it('isDefault sempre desbloqueado', () => {
    const room = scenesCatalog.find(s => s.id === 'room')!;
    expect(checkSceneUnlock(room, { level: 0, longestStreak: 0, currentStreak: 0 })).toBe(true);
  });

  it('level unlock — bate threshold', () => {
    const mountain = scenesCatalog.find(s => s.id === 'mountain')!;
    expect(checkSceneUnlock(mountain, { level: 6, longestStreak: 0, currentStreak: 0 })).toBe(true);
    expect(checkSceneUnlock(mountain, { level: 5, longestStreak: 0, currentStreak: 0 })).toBe(false);
  });

  it('streak unlock — current OR longest', () => {
    const forest = scenesCatalog.find(s => s.id === 'forest')!;
    expect(checkSceneUnlock(forest, { level: 1, longestStreak: 7, currentStreak: 0 })).toBe(true);
    expect(checkSceneUnlock(forest, { level: 1, longestStreak: 0, currentStreak: 7 })).toBe(true);
    expect(checkSceneUnlock(forest, { level: 1, longestStreak: 6, currentStreak: 6 })).toBe(false);
  });

  it('outros kinds não suportados → false', () => {
    const synthetic = {
      id: 'x', name: 'x', emoji: 'x', description: 'x', premium: false,
      unlock: { kind: 'mission_count' as const, value: 1, label: 'x' },
    };
    expect(checkSceneUnlock(synthetic, { level: 99, longestStreak: 99, currentStreak: 99 })).toBe(false);
  });
});

describe('premium scenes', () => {
  it('library, lunar, cafe são premium', () => {
    const premium = scenesCatalog.filter(s => s.premium).map(s => s.id);
    expect(premium).toContain('library');
    expect(premium).toContain('lunar');
    expect(premium).toContain('cafe');
  });

  it('room NÃO é premium', () => {
    expect(scenesCatalog.find(s => s.id === 'room')?.premium).toBe(false);
  });
});
