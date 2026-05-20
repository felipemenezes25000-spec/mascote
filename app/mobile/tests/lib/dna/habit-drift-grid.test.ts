/**
 * Grid exaustivo de habit drift — toda combinação de hábito × intensity,
 * e propriedades fortes via fast-check (drift monotonicamente não-negativo).
 *
 * O princípio inviolável aqui é: drift NUNCA reduz um gene. Faltar não
 * pune. Hábitos cumpridos só aumentam. Isso é testado em mais de 100
 * combinações + property tests com inputs gerados.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  GENE_KEYS,
  GENE_MAX,
  GENE_MIN,
  HABIT_GENE_MAP,
  applyHabitDrift,
  applyManyDrifts,
  applyDecay,
  dominantChange,
  geneDelta,
  generateGenome,
  neutralGenome,
  sanitizeGenome,
} from '@/lib/dna';
import type { Genome, GeneKey } from '@/lib/dna';
import type { HabitKind } from '@/types';

const HABITS: HabitKind[] = [
  'water', 'sleep', 'exercise', 'meditation', 'reading',
  'journaling', 'breath', 'outdoor', 'sun',
];
const INTENSITIES = [0, 0.1, 0.25, 0.5, 0.75, 1, 1.5, -0.5];

describe('HABIT_GENE_MAP — toda entrada existe', () => {
  it.each(HABITS)('habit %s tem entrada definida', habit => {
    expect(HABIT_GENE_MAP[habit]).toBeDefined();
  });

  it.each(HABITS)('habit %s só referencia genes válidos', habit => {
    const effects = HABIT_GENE_MAP[habit];
    for (const key of Object.keys(effects)) {
      expect(GENE_KEYS.includes(key as GeneKey)).toBe(true);
    }
  });

  it.each(HABITS)('habit %s tem todos os pesos não-negativos', habit => {
    const effects = HABIT_GENE_MAP[habit];
    for (const v of Object.values(effects)) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('applyHabitDrift — grid habitat × intensity', () => {
  const grid = HABITS.flatMap(h => INTENSITIES.map(i => [h, i] as const));

  it.each(grid)('habit=%s intensity=%s — sempre retorna genome válido', (habit, intensity) => {
    const next = applyHabitDrift(neutralGenome(), { habit, intensity });
    for (const k of GENE_KEYS) {
      expect(next[k]).toBeGreaterThanOrEqual(GENE_MIN);
      expect(next[k]).toBeLessThanOrEqual(GENE_MAX);
      expect(Number.isFinite(next[k])).toBe(true);
    }
  });

  it.each(grid)('habit=%s intensity=%s — NUNCA reduz nenhum gene (sem culpa)', (habit, intensity) => {
    const prev = neutralGenome();
    const next = applyHabitDrift(prev, { habit, intensity });
    for (const k of GENE_KEYS) {
      expect(next[k]).toBeGreaterThanOrEqual(prev[k]);
    }
  });

  it.each(HABITS)('habit=%s intensity=0 não muda nada', habit => {
    const prev = neutralGenome();
    const next = applyHabitDrift(prev, { habit, intensity: 0 });
    expect(next).toEqual(prev);
  });

  it.each(HABITS)('habit=%s intensity=1 reforça os genes afins', habit => {
    const prev = neutralGenome();
    const next = applyHabitDrift(prev, { habit, intensity: 1 });
    const targets = HABIT_GENE_MAP[habit];
    for (const gene of Object.keys(targets) as GeneKey[]) {
      if ((targets[gene] ?? 0) > 0) {
        expect(next[gene]).toBeGreaterThan(prev[gene]);
      }
    }
  });

  it.each(HABITS)('habit=%s — intensity negativa NÃO regride (clamped a 0)', habit => {
    const next = applyHabitDrift(neutralGenome(), { habit, intensity: -1 });
    expect(next).toEqual(neutralGenome());
  });
});

describe('applyManyDrifts', () => {
  it.each(HABITS)('habit=%s — 30 dias seguidos NÃO ultrapassa GENE_MAX', habit => {
    const drifts = Array.from({ length: 30 }, () => ({ habit, intensity: 1 }));
    const next = applyManyDrifts(neutralGenome(), drifts);
    for (const k of GENE_KEYS) {
      expect(next[k]).toBeLessThanOrEqual(GENE_MAX);
    }
  });

  it('sequência vazia retorna o genome de entrada', () => {
    const g = generateGenome(42);
    expect(applyManyDrifts(g, [])).toEqual(g);
  });

  it.each(HABITS)('habit=%s — 100 drifts ainda mantém isGenome válido', habit => {
    const drifts = Array.from({ length: 100 }, () => ({ habit, intensity: 1 }));
    const next = applyManyDrifts(neutralGenome(), drifts);
    expect(sanitizeGenome(next)).toEqual(next);
  });
});

describe('applyDecay (no-punishment)', () => {
  const DAYS = [0, 1, 3, 7, 30, 365];
  it.each(DAYS)('days=%i — NUNCA atravessa 0.5 (sem culpa)', days => {
    const g: Genome = { ...neutralGenome(), empathy: 0.9, curiosity: 0.1 };
    const next = applyDecay(g, days);
    expect(next.empathy).toBeGreaterThanOrEqual(0.5);
    expect(next.curiosity).toBeLessThanOrEqual(0.5);
  });

  it.each(DAYS)('days=%i — 0.5 é ponto fixo', days => {
    const g = neutralGenome();
    const next = applyDecay(g, days);
    for (const k of GENE_KEYS) {
      expect(next[k]).toBe(0.5);
    }
  });

  it('days=0 não muda nada', () => {
    const g = generateGenome(42);
    expect(applyDecay(g, 0)).toEqual(g);
  });

  it('days negativos viram 0', () => {
    const g = generateGenome(42);
    expect(applyDecay(g, -5)).toEqual(g);
  });

  it('days fracionários são floor-eados', () => {
    const g = generateGenome(42);
    expect(applyDecay(g, 0.9)).toEqual(g);
  });
});

describe('geneDelta', () => {
  it.each(GENE_KEYS)('gene %s — delta positivo quando próximo > prev', gene => {
    const prev = { ...neutralGenome() };
    const next = { ...neutralGenome(), [gene]: 0.7 };
    expect(geneDelta(prev, next, gene)).toBeCloseTo(0.2);
  });

  it.each(GENE_KEYS)('gene %s — delta negativo quando next < prev', gene => {
    const prev = { ...neutralGenome(), [gene]: 0.7 };
    const next = { ...neutralGenome() };
    expect(geneDelta(prev, next, gene)).toBeLessThan(0);
  });
});

describe('dominantChange', () => {
  it('genomes iguais retornam null', () => {
    const g = generateGenome(42);
    expect(dominantChange(g, g)).toBeNull();
  });

  it.each(GENE_KEYS)('gene %s isoladamente alterado é dominante', gene => {
    const prev = neutralGenome();
    const next = { ...neutralGenome(), [gene]: 0.9 };
    const change = dominantChange(prev, next);
    expect(change?.gene).toBe(gene);
    expect(change?.delta).toBeCloseTo(0.4);
  });
});

describe('PROPERTY: drift sempre não-negativo', () => {
  it('para qualquer (habit, intensity, seed): next[k] >= prev[k]', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...HABITS),
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.integer({ min: 1, max: 0xffffffff }),
        (habit, intensity, seed) => {
          const prev = generateGenome(seed);
          const next = applyHabitDrift(prev, { habit, intensity });
          for (const k of GENE_KEYS) {
            if (next[k] < prev[k]) return false;
          }
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('PROPERTY: drift nunca excede GENE_MAX', () => {
  it('genome[k] sempre em [GENE_MIN, GENE_MAX] após drift', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...HABITS),
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.integer({ min: 1, max: 0xffffffff }),
        (habit, intensity, seed) => {
          const prev = generateGenome(seed);
          const next = applyHabitDrift(prev, { habit, intensity });
          for (const k of GENE_KEYS) {
            if (next[k] < GENE_MIN || next[k] > GENE_MAX) return false;
          }
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });
});
