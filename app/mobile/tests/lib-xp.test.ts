/**
 * Testes do core economy: XP, level, phase progression.
 * Esses são os números que sustentam toda gamificação.
 */

import { describe, expect, it } from 'vitest';
import {
  XP_DAILY_CAP,
  XP_PER_CHECKIN,
  applyXp,
  levelFromXp,
  phaseFromXp,
  xpForLevel,
  xpToNextLevel,
} from '@/lib/xp';
import type { Mascot } from '@/types';

function mockMascot(overrides: Partial<Mascot> = {}): Mascot {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Test',
    personality: 'calmo',
    phase: 'bebe',
    mood: 'feliz',
    xp: 0,
    level: 1,
    energy: 80,
    health: 100,
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('xpForLevel', () => {
  it('retorna 0 pra nível 1 (origem)', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('escala de forma quadrática', () => {
    expect(xpForLevel(2)).toBe(50);
    expect(xpForLevel(3)).toBe(150);
    expect(xpForLevel(5)).toBe(500);
    expect(xpForLevel(10)).toBe(2250);
  });
});

describe('levelFromXp', () => {
  it('retorna nível 1 pra 0 XP', () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it('sobe pra nível 2 quando passa 50 XP', () => {
    expect(levelFromXp(49)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
    expect(levelFromXp(149)).toBe(2);
    expect(levelFromXp(150)).toBe(3);
  });

  it('é monotônico (nunca volta)', () => {
    let last = 1;
    for (let xp = 0; xp < 10000; xp += 100) {
      const lvl = levelFromXp(xp);
      expect(lvl).toBeGreaterThanOrEqual(last);
      last = lvl;
    }
  });
});

describe('phaseFromXp', () => {
  it('mapeia thresholds corretamente', () => {
    expect(phaseFromXp(0)).toBe('ovo');
    expect(phaseFromXp(99)).toBe('ovo');
    expect(phaseFromXp(100)).toBe('bebe');
    expect(phaseFromXp(499)).toBe('bebe');
    expect(phaseFromXp(500)).toBe('crianca');
    expect(phaseFromXp(2000)).toBe('adolescente');
    expect(phaseFromXp(8000)).toBe('adulto');
    expect(phaseFromXp(25000)).toBe('evoluido');
    expect(phaseFromXp(100000)).toBe('evoluido');
  });
});

describe('xpToNextLevel', () => {
  it('calcula progresso correto em nível 1', () => {
    const r = xpToNextLevel(25);
    expect(r.current).toBe(25); // 25 - 0
    expect(r.needed).toBe(50); // 50 - 0
    expect(r.progress).toBeCloseTo(0.5);
  });

  it('reseta no level up', () => {
    const r = xpToNextLevel(50);
    expect(r.current).toBe(0);
    expect(r.needed).toBe(100); // 150 - 50
    expect(r.progress).toBe(0);
  });
});

describe('applyXp', () => {
  it('respeita o cap diário (não dá mais que XP_DAILY_CAP num dia)', () => {
    const mascot = mockMascot({ xp: 0 });
    const result = applyXp(mascot, 200, XP_DAILY_CAP - 10);
    expect(result.delta).toBe(10);
    expect(result.mascot.xp).toBe(10);
  });

  it('retorna delta 0 quando cap totalmente atingido', () => {
    const mascot = mockMascot();
    const result = applyXp(mascot, 50, XP_DAILY_CAP);
    expect(result.delta).toBe(0);
    expect(result.mascot.xp).toBe(0);
  });

  it('detecta level up corretamente', () => {
    const mascot = mockMascot({ xp: 45, level: 1 });
    const result = applyXp(mascot, 10, 0);
    expect(result.leveledUp).toBe(true);
    expect(result.mascot.level).toBe(2);
  });

  it('detecta phase change corretamente', () => {
    const mascot = mockMascot({ xp: 95, phase: 'ovo' });
    const result = applyXp(mascot, 20, 0);
    expect(result.phaseChanged).toBe(true);
    expect(result.prevPhase).toBe('ovo');
    expect(result.mascot.phase).toBe('bebe');
  });

  it('NÃO marca phase change quando não muda', () => {
    const mascot = mockMascot({ xp: 200, phase: 'bebe' });
    const result = applyXp(mascot, 10, 0);
    expect(result.phaseChanged).toBe(false);
  });

  it('boost energy mas cap em 100', () => {
    const mascot = mockMascot({ energy: 95 });
    const result = applyXp(mascot, 10, 0);
    expect(result.mascot.energy).toBe(100);
  });

  it('XP_PER_CHECKIN é o valor base esperado', () => {
    expect(XP_PER_CHECKIN).toBe(10);
  });

  it('XP_DAILY_CAP é razoável (entre 100 e 200)', () => {
    expect(XP_DAILY_CAP).toBeGreaterThanOrEqual(100);
    expect(XP_DAILY_CAP).toBeLessThanOrEqual(200);
  });
});
