import { describe, expect, it } from 'vitest';
import {
  PHASE_THRESHOLDS,
  XP_DAILY_CAP,
  XP_PER_CHECKIN,
  applyXp,
  deriveMoodFromState,
  levelFromXp,
  phaseFromXp,
  xpForLevel,
  xpToNextLevel,
} from '@/lib/xp';
import type { Mascot } from '@/types';

function baseMascot(overrides: Partial<Mascot> = {}): Mascot {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Robo',
    personality: 'calmo',
    phase: 'ovo',
    mood: 'ok',
    xp: 0,
    level: 1,
    energy: 50,
    health: 100,
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('xp - funções puras', () => {
  it('xpForLevel(1) = 0', () => expect(xpForLevel(1)).toBe(0));
  it('xpForLevel cresce monotonicamente', () => {
    for (let i = 2; i < 20; i++) {
      expect(xpForLevel(i)).toBeGreaterThan(xpForLevel(i - 1));
    }
  });
  it('xpForLevel(0) e negativos = 0', () => {
    expect(xpForLevel(0)).toBe(0);
    expect(xpForLevel(-5)).toBe(0);
  });

  it('levelFromXp em fronteira de nível', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
    expect(levelFromXp(149)).toBe(2);
    expect(levelFromXp(150)).toBe(3);
  });
  it('levelFromXp lida com Infinity sem loop', () => {
    expect(levelFromXp(Infinity)).toBe(1);
    expect(levelFromXp(NaN)).toBe(1);
  });

  it('phaseFromXp respeita PHASE_THRESHOLDS', () => {
    expect(phaseFromXp(0)).toBe('ovo');
    expect(phaseFromXp(50)).toBe('ovo');
    expect(phaseFromXp(100)).toBe('bebe');
    expect(phaseFromXp(500)).toBe('crianca');
    expect(phaseFromXp(2000)).toBe('adolescente');
    expect(phaseFromXp(8000)).toBe('adulto');
    expect(phaseFromXp(25000)).toBe('evoluido');
  });

  it('xpToNextLevel retorna progress entre 0 e 1', () => {
    const r = xpToNextLevel(25);
    expect(r.current).toBe(25);
    expect(r.needed).toBeGreaterThan(0);
    expect(r.progress).toBeGreaterThan(0);
    expect(r.progress).toBeLessThan(1);
  });

  it('xpToNextLevel em xp 0 → progress 0', () => {
    expect(xpToNextLevel(0).progress).toBe(0);
  });
});

describe('xp - applyXp', () => {
  it('respeita XP_DAILY_CAP', () => {
    const m = baseMascot();
    const r = applyXp(m, XP_DAILY_CAP + 100, 0);
    expect(r.delta).toBe(XP_DAILY_CAP);
    expect(r.mascot.xp).toBe(XP_DAILY_CAP);
  });

  it('não dá XP negativo', () => {
    const m = baseMascot();
    const r = applyXp(m, -50, 0);
    expect(r.delta).toBe(0);
  });

  it('quando já ultrapassou cap, delta = 0', () => {
    const m = baseMascot();
    const r = applyXp(m, 10, XP_DAILY_CAP + 5);
    expect(r.delta).toBe(0);
  });

  it('leveledUp = true quando passa fronteira de nível', () => {
    const m = baseMascot({ xp: 45, level: 1 });
    const r = applyXp(m, 20, 0);
    expect(r.leveledUp).toBe(true);
    expect(r.mascot.level).toBe(2);
  });

  it('phaseChanged = true quando cruza threshold de fase', () => {
    const m = baseMascot({ xp: 95, phase: 'ovo' });
    const r = applyXp(m, 10, 0);
    expect(r.phaseChanged).toBe(true);
    expect(r.mascot.phase).toBe('bebe');
    expect(r.prevPhase).toBe('ovo');
  });

  it('aumenta energy em +10, clampado em 100', () => {
    expect(applyXp(baseMascot({ energy: 50 }), 5, 0).mascot.energy).toBe(60);
    expect(applyXp(baseMascot({ energy: 95 }), 5, 0).mascot.energy).toBe(100);
    expect(applyXp(baseMascot({ energy: -5 }), 5, 0).mascot.energy).toBe(10);
  });

  it('mood derivado de energy: 80+ → empolgado', () => {
    expect(applyXp(baseMascot({ energy: 70 }), 5, 0).mascot.mood).toBe('empolgado');
  });
  it('mood derivado de energy: 50..79 → feliz', () => {
    expect(applyXp(baseMascot({ energy: 50 }), 5, 0).mascot.mood).toBe('feliz');
  });
  it('mood derivado de energy: <50 → ok', () => {
    // 30 + 10 = 40 < 50 → 'ok'
    expect(applyXp(baseMascot({ energy: 30 }), 5, 0).mascot.mood).toBe('ok');
    // 25 + 10 = 35 → 'ok'
    expect(applyXp(baseMascot({ energy: 25 }), 5, 0).mascot.mood).toBe('ok');
  });
});

describe('xp - deriveMoodFromState', () => {
  it('72h+ sem check-in → exausto', () => {
    expect(deriveMoodFromState(baseMascot({ energy: 90 }), 80)).toBe('exausto');
  });
  it('36..71h sem check-in → triste', () => {
    expect(deriveMoodFromState(baseMascot({ energy: 90 }), 40)).toBe('triste');
  });
  it('energy < 20 → triste', () => {
    expect(deriveMoodFromState(baseMascot({ energy: 10 }), 1)).toBe('triste');
  });
  it('energy >= 80 → empolgado', () => {
    expect(deriveMoodFromState(baseMascot({ energy: 90 }), 1)).toBe('empolgado');
  });
  it('energy 50..79 → feliz', () => {
    expect(deriveMoodFromState(baseMascot({ energy: 60 }), 1)).toBe('feliz');
  });
  it('energy 20..49 → ok', () => {
    expect(deriveMoodFromState(baseMascot({ energy: 30 }), 1)).toBe('ok');
  });
});

describe('xp - constantes públicas', () => {
  it('XP_PER_CHECKIN >= 1 e XP_DAILY_CAP > XP_PER_CHECKIN', () => {
    expect(XP_PER_CHECKIN).toBeGreaterThanOrEqual(1);
    expect(XP_DAILY_CAP).toBeGreaterThan(XP_PER_CHECKIN);
  });
  it('PHASE_THRESHOLDS começa em 0 e cresce monotonicamente', () => {
    expect(PHASE_THRESHOLDS[0].xp).toBe(0);
    for (let i = 1; i < PHASE_THRESHOLDS.length; i++) {
      expect(PHASE_THRESHOLDS[i].xp).toBeGreaterThan(PHASE_THRESHOLDS[i - 1].xp);
    }
  });
});

describe('applyXp - fase NÃO regride (bug encontrado em runtime)', () => {
  // Bug real: estado persistido inconsistente (e.g. phase='bebe' com xp=0)
  // fazia o modal de evolução celebrar "Zip evoluiu de Bebê → Ovo".
  // applyXp agora trata phase como monotonicamente crescente.
  it('phase salvo > derivado do XP: mantém phase salvo', () => {
    const m = baseMascot({ xp: 0, phase: 'bebe' });
    const r = applyXp(m, 15, 0);
    // derivedFromXp(15) seria 'ovo', mas salvo é 'bebe' (maior). Mantém 'bebe'.
    expect(r.mascot.phase).toBe('bebe');
    expect(r.phaseChanged).toBe(false);
    expect(r.prevPhase).toBe('bebe');
  });

  it('phase derivado > salvo: avança normalmente (acréscimo legítimo)', () => {
    const m = baseMascot({ xp: 95, phase: 'ovo' });
    const r = applyXp(m, 20, 0);
    // xp passa pra 115 → derivado = 'bebe' > 'ovo' salvo. Avança.
    expect(r.mascot.phase).toBe('bebe');
    expect(r.phaseChanged).toBe(true);
    expect(r.prevPhase).toBe('ovo');
  });

  it('phase derivado == salvo: sem mudança', () => {
    const m = baseMascot({ xp: 150, phase: 'bebe' });
    const r = applyXp(m, 10, 0);
    expect(r.mascot.phase).toBe('bebe');
    expect(r.phaseChanged).toBe(false);
  });

  it('estado super-inconsistente: phase=adulto com xp=0 não regride pra ovo', () => {
    const m = baseMascot({ xp: 0, phase: 'adulto' });
    const r = applyXp(m, 50, 0);
    expect(r.mascot.phase).toBe('adulto');
    expect(r.phaseChanged).toBe(false);
  });
});
