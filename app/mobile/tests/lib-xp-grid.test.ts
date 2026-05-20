/**
 * Grid exaustivo de XP — formula triangular, monotonicidade do nível,
 * fases, cap diário, sanitização de inputs malformados.
 *
 * 50 níveis × propriedades + fases × thresholds + applyXp em ~10 cenários
 * = 150+ tests.
 */

import { describe, expect, it } from 'vitest';
import {
  PHASE_THRESHOLDS,
  XP_DAILY_CAP,
  XP_FIRST_OF_DAY_BONUS,
  XP_PER_CHECKIN,
  applyXp,
  levelFromXp,
  phaseFromXp,
  xpForLevel,
  xpToNextLevel,
} from '@/lib/xp';
import type { Mascot, MascotPhase } from '@/types';

const LEVELS = Array.from({ length: 50 }, (_, i) => i + 1);
const FAR_XP_VALUES = [0, 10, 100, 500, 1000, 5000, 10000, 25000, 100000, 1_000_000];

function makeMascot(overrides: Partial<Mascot> = {}): Mascot {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Test',
    personality: 'calmo',
    phase: 'ovo',
    mood: 'ok',
    xp: 0,
    level: 1,
    energy: 50,
    health: 100,
    created_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('xpForLevel — formula triangular', () => {
  it.each(LEVELS)('level %i retorna inteiro não-negativo', n => {
    const xp = xpForLevel(n);
    expect(Number.isInteger(xp)).toBe(true);
    expect(xp).toBeGreaterThanOrEqual(0);
  });

  it('level 1 = 0', () => expect(xpForLevel(1)).toBe(0));
  it('level 2 = 50', () => expect(xpForLevel(2)).toBe(50));
  it('level 3 = 150', () => expect(xpForLevel(3)).toBe(150));
  it('level 4 = 300', () => expect(xpForLevel(4)).toBe(300));
  it('level 5 = 500', () => expect(xpForLevel(5)).toBe(500));

  it.each(LEVELS.slice(1))('level %i é estritamente maior que level n-1', n => {
    expect(xpForLevel(n)).toBeGreaterThan(xpForLevel(n - 1));
  });

  it('level 0 retorna 0 (defensivo)', () => {
    expect(xpForLevel(0)).toBe(0);
  });

  it('level negativo retorna 0', () => {
    expect(xpForLevel(-5)).toBe(0);
  });
});

describe('levelFromXp — inversão monotônica', () => {
  it.each(LEVELS)('XP exato do level %i mapeia para level %i', n => {
    expect(levelFromXp(xpForLevel(n))).toBe(n);
  });

  it.each(LEVELS.slice(0, 30))('XP do level %i + 1 ainda é level %i', n => {
    expect(levelFromXp(xpForLevel(n) + 1)).toBe(n);
  });

  it.each([0, -1, -100, NaN, Infinity, -Infinity])('XP inválido (%s) retorna level 1', xp => {
    expect(levelFromXp(xp)).toBe(1);
  });

  it.each(FAR_XP_VALUES)('XP=%i sempre retorna level >= 1', xp => {
    expect(levelFromXp(xp)).toBeGreaterThanOrEqual(1);
  });
});

describe('phaseFromXp — transições monotônicas', () => {
  it.each(PHASE_THRESHOLDS)('XP do threshold ($xp) retorna fase $phase', ({ xp, phase }) => {
    expect(phaseFromXp(xp)).toBe(phase);
  });

  it.each(PHASE_THRESHOLDS)('XP do threshold ($xp) + 1 ainda retorna $phase', ({ xp, phase }) => {
    expect(phaseFromXp(xp + 1)).toBe(phase);
  });

  it('XP=0 → ovo', () => expect(phaseFromXp(0)).toBe('ovo'));
  it('XP=99 → ovo', () => expect(phaseFromXp(99)).toBe('ovo'));
  it('XP=100 → bebe', () => expect(phaseFromXp(100)).toBe('bebe'));
  it('XP=499 → bebe', () => expect(phaseFromXp(499)).toBe('bebe'));
  it('XP=500 → crianca', () => expect(phaseFromXp(500)).toBe('crianca'));
  it('XP=2000 → adolescente', () => expect(phaseFromXp(2000)).toBe('adolescente'));
  it('XP=8000 → adulto', () => expect(phaseFromXp(8000)).toBe('adulto'));
  it('XP=25000 → evoluido', () => expect(phaseFromXp(25000)).toBe('evoluido'));
  it('XP=1_000_000 → evoluido', () => expect(phaseFromXp(1_000_000)).toBe('evoluido'));
});

describe('xpToNextLevel', () => {
  it.each(LEVELS.slice(0, 30))('level=%i — needed > 0 (exceto último)', n => {
    const xp = xpForLevel(n);
    const r = xpToNextLevel(xp);
    expect(r.needed).toBeGreaterThan(0);
  });

  it.each(LEVELS.slice(0, 30))('level=%i — progress=0 no exato threshold', n => {
    const xp = xpForLevel(n);
    const r = xpToNextLevel(xp);
    expect(r.progress).toBeCloseTo(0);
  });

  it.each([0.25, 0.5, 0.75])('progress=%s — XP halfway entre níveis', frac => {
    const xpHalf = xpForLevel(2) + Math.floor(frac * (xpForLevel(3) - xpForLevel(2)));
    const r = xpToNextLevel(xpHalf);
    expect(r.progress).toBeCloseTo(frac, 1);
  });
});

describe('applyXp — sanitização', () => {
  it.each([NaN, Infinity, -Infinity, -10, -1000])('delta inválido (%s) vira 0', delta => {
    const m = makeMascot();
    const r = applyXp(m, delta as number, 0);
    expect(r.delta).toBe(0);
    expect(r.mascot.xp).toBe(0);
  });

  it.each([0, 1, 10, 50, 100, 150])('delta=%i aplicado com 0 já gasto não excede cap', delta => {
    const m = makeMascot();
    const r = applyXp(m, delta, 0);
    expect(r.delta).toBeLessThanOrEqual(XP_DAILY_CAP);
  });

  it('delta acumulado nunca excede XP_DAILY_CAP no dia', () => {
    const m = makeMascot();
    const r = applyXp(m, 200, 0);
    expect(r.delta).toBe(XP_DAILY_CAP);
  });

  it('alreadyToday >= cap → delta = 0', () => {
    const m = makeMascot();
    const r = applyXp(m, 50, XP_DAILY_CAP);
    expect(r.delta).toBe(0);
  });

  it.each([NaN, -1, Infinity])('alreadyToday inválido (%s) é tratado como 0', already => {
    const m = makeMascot();
    const r = applyXp(m, 10, already as number);
    expect(r.delta).toBe(10);
  });

  it('phase NUNCA regride mesmo se mascot.phase persistido for maior que phaseFromXp(xp)', () => {
    const m = makeMascot({ phase: 'adulto', xp: 0 });
    const r = applyXp(m, 10, 0);
    expect(r.mascot.phase).toBe('adulto');
    expect(r.phaseChanged).toBe(false);
  });

  it('phaseChanged true quando ultrapassa threshold', () => {
    const m = makeMascot({ phase: 'ovo', xp: 99, level: 1 });
    const r = applyXp(m, 5, 0);
    expect(r.mascot.phase).toBe('bebe');
    expect(r.phaseChanged).toBe(true);
  });

  it('leveledUp true quando ultrapassa threshold de level', () => {
    const m = makeMascot({ xp: 49, level: 1 });
    const r = applyXp(m, 5, 0);
    expect(r.leveledUp).toBe(true);
    expect(r.mascot.level).toBe(2);
  });

  it('energy +10 capped at 100', () => {
    const m = makeMascot({ energy: 95 });
    const r = applyXp(m, 10, 0);
    expect(r.mascot.energy).toBe(100);
  });

  it('energy negativa é tratada como 0 + boost = 10', () => {
    const m = makeMascot({ energy: -5 });
    const r = applyXp(m, 10, 0);
    expect(r.mascot.energy).toBe(10);
  });
});

describe('constantes', () => {
  it('XP_PER_CHECKIN é positivo', () => expect(XP_PER_CHECKIN).toBeGreaterThan(0));
  it('XP_DAILY_CAP é múltiplo de XP_PER_CHECKIN', () => {
    expect(XP_DAILY_CAP % XP_PER_CHECKIN).toBe(0);
  });
  it('XP_FIRST_OF_DAY_BONUS é positivo', () => expect(XP_FIRST_OF_DAY_BONUS).toBeGreaterThan(0));
  it('XP_DAILY_CAP é finito', () => expect(Number.isFinite(XP_DAILY_CAP)).toBe(true));
});

describe('PHASE_THRESHOLDS contém todas as fases', () => {
  const phases: MascotPhase[] = ['ovo', 'bebe', 'crianca', 'adolescente', 'adulto', 'evoluido'];
  it.each(phases)('phase %s está em PHASE_THRESHOLDS', phase => {
    expect(PHASE_THRESHOLDS.some(t => t.phase === phase)).toBe(true);
  });

  it('thresholds são monotonicamente crescentes', () => {
    for (let i = 1; i < PHASE_THRESHOLDS.length; i++) {
      expect(PHASE_THRESHOLDS[i].xp).toBeGreaterThan(PHASE_THRESHOLDS[i - 1].xp);
    }
  });
});
