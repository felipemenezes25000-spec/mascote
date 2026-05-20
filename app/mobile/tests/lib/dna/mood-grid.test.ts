/**
 * Grid de mood (humor) — moodScore, moodLabel, moodToLegacy, behaviorTraits.
 *
 * Mood é derivado puramente do genoma — testes determinísticos cobrem
 * todos os ranges + cada gene individualmente afetando o resultado.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  GENE_KEYS,
  moodScore,
  moodLabel,
  moodToLegacy,
  behaviorTraits,
  neutralGenome,
  generateGenome,
} from '@/lib/dna';
import type { Genome } from '@/lib/dna';

describe('moodScore — range', () => {
  it.each([0, 1, 42, 100, 999, 12345])('seed=%i — moodScore em [0, 1]', seed => {
    const s = moodScore(generateGenome(seed));
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('genoma neutro tem score >= 0', () => {
    expect(moodScore(neutralGenome())).toBeGreaterThanOrEqual(0);
  });

  it.each(GENE_KEYS)('aumentar %s não quebra o range', gene => {
    const g: Genome = { ...neutralGenome(), [gene]: 0.95 };
    const s = moodScore(g);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

describe('moodScore — genes positivos vs tensos', () => {
  it('empathy+socialEnergy altas elevam o score', () => {
    const high: Genome = { ...neutralGenome(), empathy: 0.9, socialEnergy: 0.9, resilience: 0.9, adaptability: 0.9 };
    const low: Genome = { ...neutralGenome(), empathy: 0.1, socialEnergy: 0.1, resilience: 0.1, adaptability: 0.1 };
    expect(moodScore(high)).toBeGreaterThan(moodScore(low));
  });

  it('aggression+chaos altas reduzem o score', () => {
    const tense: Genome = { ...neutralGenome(), aggression: 0.95, chaos: 0.95 };
    const calm: Genome = { ...neutralGenome(), aggression: 0.05, chaos: 0.05 };
    expect(moodScore(tense)).toBeLessThan(moodScore(calm));
  });
});

describe('moodLabel — retorna string PT-BR não vazia', () => {
  const SAMPLES = [0, 1, 42, 100, 999, 12345, 67890];
  it.each(SAMPLES)('seed=%i — label não vazia', seed => {
    const label = moodLabel(generateGenome(seed));
    expect(label).toBeTruthy();
    expect(label.length).toBeGreaterThan(0);
  });

  it('mood radiante para genome muito positivo', () => {
    const g: Genome = { ...neutralGenome(), empathy: 0.98, socialEnergy: 0.98, resilience: 0.98, adaptability: 0.98, aggression: 0.02, chaos: 0.02 };
    expect(moodLabel(g)).toMatch(/radiante/);
  });

  it('mood retraída para genome muito tenso', () => {
    const g: Genome = { ...neutralGenome(), empathy: 0.02, socialEnergy: 0.02, resilience: 0.02, adaptability: 0.02, aggression: 0.98, chaos: 0.98 };
    expect(moodLabel(g)).toMatch(/retra[ií]da|inquieta/);
  });
});

describe('moodToLegacy — mapeia para MascotMood', () => {
  const VALID_MOODS = ['triste', 'ok', 'feliz', 'empolgado', 'exausto'];
  it.each([0, 1, 42, 100, 999, 12345])('seed=%i — retorna mood válido', seed => {
    expect(VALID_MOODS).toContain(moodToLegacy(generateGenome(seed)));
  });

  it('genome radiante → empolgado', () => {
    const g: Genome = { ...neutralGenome(), empathy: 0.95, socialEnergy: 0.95, resilience: 0.95, adaptability: 0.95, aggression: 0.05, chaos: 0.05 };
    expect(moodToLegacy(g)).toBe('empolgado');
  });

  it('genome muito tenso → exausto', () => {
    const g: Genome = { ...neutralGenome(), empathy: 0.02, socialEnergy: 0.02, resilience: 0.02, adaptability: 0.02, aggression: 0.98, chaos: 0.98 };
    expect(moodToLegacy(g)).toBe('exausto');
  });
});

describe('behaviorTraits', () => {
  it('genome neutro retorna pelo menos 1 trait', () => {
    const traits = behaviorTraits(neutralGenome());
    expect(traits.length).toBeGreaterThanOrEqual(1);
  });

  it('máximo de 4 traits retornados', () => {
    const g: Genome = {
      empathy: 0.95, curiosity: 0.95, creativity: 0.95, discipline: 0.95,
      chaos: 0.95, aggression: 0.95, resilience: 0.95, emotionalDepth: 0.95,
      socialEnergy: 0.95, adaptability: 0.95, intelligence: 0.95,
    };
    expect(behaviorTraits(g).length).toBeLessThanOrEqual(4);
  });

  const GENE_THRESHOLDS: Array<[string, Partial<Genome>, RegExp]> = [
    ['empathy alta', { empathy: 0.95 }, /inclina/],
    ['curiosity alta', { curiosity: 0.95 }, /olhos? segue/],
    ['aggression alta', { aggression: 0.95 }, /r[ií]gida|contra[ií]da/],
    ['socialEnergy alta', { socialEnergy: 0.95 }, /aura.*expande/],
    ['chaos alta', { chaos: 0.95 }, /imprevis[ií]ve[il]/],
    ['discipline alta', { discipline: 0.95 }, /respira[çc][ãa]o.*ritmada/],
    ['emotionalDepth alta', { emotionalDepth: 0.95 }, /cor muda/],
    ['intelligence alta', { intelligence: 0.95 }, /observa antes/],
    ['adaptability alta', { adaptability: 0.95 }, /absorve mudan[çc]as/],
    ['resilience alta', { resilience: 0.95 }, /presen[çc]a mesmo em pausas/],
  ];
  it.each(GENE_THRESHOLDS)('%s → contém trait esperada', (_label, override, pattern) => {
    const g: Genome = { ...neutralGenome(), ...override };
    const traits = behaviorTraits(g);
    expect(traits.some(t => pattern.test(t))).toBe(true);
  });

  it('todos os traits são strings não vazias', () => {
    for (const seed of [1, 42, 999, 12345]) {
      const traits = behaviorTraits(generateGenome(seed));
      for (const t of traits) {
        expect(typeof t).toBe('string');
        expect(t.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('PROPERTY: moodScore sempre em [0, 1] para qualquer genoma', () => {
  it('para qualquer seed: 0 <= moodScore <= 1', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 0xffffffff }), seed => {
        const s = moodScore(generateGenome(seed));
        return s >= 0 && s <= 1;
      }),
      { numRuns: 200 },
    );
  });
});
