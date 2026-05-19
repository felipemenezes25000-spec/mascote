/**
 * Property tests do drift de hábito → DNA.
 *
 * INVARIANTES INVIOLÁVEIS (preservados via fast-check):
 *  - Drift NUNCA reduz nenhum gene (princípio: sem culpa)
 *  - Drift nunca excede GENE_MAX
 *  - Drift é determinístico (mesmos inputs = mesma saída)
 *  - intensity=0 não muda nada
 *  - intensity negativa é tratada como 0 (sem culpa mesmo se chamador errar)
 *  - 30 drifts seguidos não corrompem genome
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  GENE_KEYS,
  GENE_MAX,
  GENE_MIN,
  applyDecay,
  applyHabitDrift,
  applyManyDrifts,
  dominantChange,
  geneDelta,
  generateGenome,
  HABIT_GENE_MAP,
  isGenome,
  neutralGenome,
} from '@/lib/dna';
import type { HabitKind } from '@/types';

const HABITS: HabitKind[] = [
  'water','sleep','exercise','meditation','reading',
  'journaling','breath','outdoor','sun',
];

describe('applyHabitDrift — invariantes', () => {
  it('NUNCA reduz nenhum gene (princípio: sem culpa)', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.constantFrom(...HABITS),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (seed, habit, intensity) => {
          const g = generateGenome(seed);
          const next = applyHabitDrift(g, { habit, intensity });
          for (const k of GENE_KEYS) {
            expect(next[k]).toBeGreaterThanOrEqual(g[k] - 1e-9);
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it('NUNCA excede GENE_MAX', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.constantFrom(...HABITS),
        (seed, habit) => {
          const g = generateGenome(seed);
          const next = applyHabitDrift(g, { habit, intensity: 1 });
          for (const k of GENE_KEYS) {
            expect(next[k]).toBeLessThanOrEqual(GENE_MAX + 1e-9);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('determinístico — mesmos inputs = mesma saída', () => {
    const g = generateGenome(7);
    const a = applyHabitDrift(g, { habit: 'sleep', intensity: 0.8 });
    const b = applyHabitDrift(g, { habit: 'sleep', intensity: 0.8 });
    expect(a).toEqual(b);
  });

  it('intensity=0 não muda nada', () => {
    const g = generateGenome(11);
    const next = applyHabitDrift(g, { habit: 'reading', intensity: 0 });
    expect(next).toEqual(g);
  });

  it('intensity negativa é tratada como 0 (sem culpa)', () => {
    const g = generateGenome(11);
    const next = applyHabitDrift(g, { habit: 'reading', intensity: -5 });
    expect(next).toEqual(g);
  });

  it('intensity > 1 é clampada para 1', () => {
    const g = generateGenome(11);
    const a = applyHabitDrift(g, { habit: 'reading', intensity: 1 });
    const b = applyHabitDrift(g, { habit: 'reading', intensity: 99 });
    expect(a).toEqual(b);
  });

  it('intensity NaN/Infinity tratada como 1 (default)', () => {
    const g = generateGenome(11);
    const a = applyHabitDrift(g, { habit: 'reading', intensity: 1 });
    const b = applyHabitDrift(g, { habit: 'reading', intensity: NaN });
    expect(a).toEqual(b);
  });

  it('genome resultante sempre é válido', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.constantFrom(...HABITS),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (seed, habit, intensity) => {
          const g = generateGenome(seed);
          const next = applyHabitDrift(g, { habit, intensity });
          expect(isGenome(next)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('imutável — drift não muta o input', () => {
    const g = generateGenome(42);
    const snapshot = { ...g };
    applyHabitDrift(g, { habit: 'sleep', intensity: 1 });
    expect(g).toEqual(snapshot);
  });
});

describe('applyManyDrifts — composição', () => {
  it('30 drifts seguidos não corrompem genome', () => {
    let g = generateGenome(99);
    for (let i = 0; i < 30; i++) {
      const h = HABITS[i % HABITS.length];
      g = applyHabitDrift(g, { habit: h, intensity: 1 });
    }
    expect(isGenome(g)).toBe(true);
  });

  it('aplicar via applyManyDrifts é equivalente a chamar applyHabitDrift em loop', () => {
    const g0 = generateGenome(33);
    const inputs = HABITS.slice(0, 5).map(habit => ({ habit, intensity: 0.7 }));
    const a = applyManyDrifts(g0, inputs);
    let b = g0;
    for (const i of inputs) b = applyHabitDrift(b, i);
    expect(a).toEqual(b);
  });
});

describe('applyDecay — não punitivo', () => {
  it('decay NUNCA empurra gene < 0.5 para baixo', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer({ min: 0, max: 1000 }), (seed, days) => {
        const g = generateGenome(seed);
        const next = applyDecay(g, days, 0.005);
        for (const k of GENE_KEYS) {
          if (g[k] < 0.5) {
            // valores abaixo de 0.5 podem SUBIR (em direção a 0.5)
            expect(next[k]).toBeGreaterThanOrEqual(g[k] - 1e-9);
          } else {
            // valores acima de 0.5 podem CAIR (em direção a 0.5), mas NUNCA abaixo de 0.5
            expect(next[k]).toBeGreaterThanOrEqual(0.5 - 1e-9);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('days=0 não muda nada', () => {
    const g = generateGenome(42);
    expect(applyDecay(g, 0)).toEqual(g);
  });

  it('days negativo é tratado como 0', () => {
    const g = generateGenome(42);
    expect(applyDecay(g, -10)).toEqual(g);
  });

  it('genoma neutro (todos 0.5) é ponto fixo de decay', () => {
    const g = neutralGenome();
    expect(applyDecay(g, 365, 0.01)).toEqual(g);
  });
});

describe('geneDelta / dominantChange', () => {
  it('geneDelta retorna 0 para genomas iguais', () => {
    const g = generateGenome(42);
    expect(geneDelta(g, g, 'empathy')).toBe(0);
  });

  it('dominantChange retorna null para deltas insignificantes', () => {
    const g = generateGenome(42);
    expect(dominantChange(g, g)).toBeNull();
  });

  it('dominantChange identifica gene que mais cresceu', () => {
    const g0 = generateGenome(42);
    // forçar drift focado em reading (intelligence + curiosity + creativity)
    const g1 = applyManyDrifts(g0, Array(10).fill({ habit: 'reading' as HabitKind, intensity: 1 }));
    const change = dominantChange(g0, g1);
    expect(change).not.toBeNull();
    // intelligence ou curiosity devem dominar
    expect(['intelligence', 'curiosity', 'creativity']).toContain(change!.gene);
    expect(change!.delta).toBeGreaterThan(0);
  });
});

describe('HABIT_GENE_MAP — cobertura', () => {
  it('todo HabitKind tem mapeamento', () => {
    for (const h of HABITS) {
      const m = HABIT_GENE_MAP[h];
      expect(m).toBeDefined();
      expect(Object.keys(m).length).toBeGreaterThan(0);
    }
  });

  it('todos os deltas são positivos (sem culpa)', () => {
    for (const h of HABITS) {
      const m = HABIT_GENE_MAP[h];
      for (const k of Object.keys(m) as Array<keyof typeof m>) {
        const v = m[k]!;
        expect(v).toBeGreaterThan(0);
      }
    }
  });
});
