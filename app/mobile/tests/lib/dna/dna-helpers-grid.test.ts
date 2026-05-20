/**
 * Grid de helpers de DNA — palette, morphology, customization.
 *
 * Cobre os módulos auxiliares de geração visual que consomem o Genome
 * e produzem morfologia/cores/customização. Cada teste exercita um
 * gene específico afetando o output.
 */

import { describe, expect, it } from 'vitest';
import {
  GENE_KEYS,
  paletteFromGenome,
  hslToHex,
  bodyHex,
  accentHex,
  glowHex,
  morphologyFromGenome,
  morphologySummary,
  applyCustomization,
  sanitizeCustomization,
  MIN_MULT,
  MAX_MULT,
  MIN_POSTURE,
  MAX_POSTURE,
  clampMultiplier,
  clampPosture,
  neutralGenome,
  generateGenome,
} from '@/lib/dna';

const SEEDS = [0, 1, 42, 100, 999, 12345, 67890];

describe('paletteFromGenome', () => {
  it.each(SEEDS)('seed=%i produz palette válida', seed => {
    const g = generateGenome(seed);
    const p = paletteFromGenome(g);
    expect(p).toBeDefined();
    expect(typeof p).toBe('object');
  });

  it.each(SEEDS)('seed=%i — bodyHex retorna inteiro 24-bit', seed => {
    const g = generateGenome(seed);
    const hex = bodyHex(paletteFromGenome(g));
    expect(Number.isInteger(hex)).toBe(true);
    expect(hex).toBeGreaterThanOrEqual(0);
    expect(hex).toBeLessThanOrEqual(0xffffff);
  });

  it.each(SEEDS)('seed=%i — accentHex retorna inteiro 24-bit', seed => {
    const g = generateGenome(seed);
    const hex = accentHex(paletteFromGenome(g));
    expect(Number.isInteger(hex)).toBe(true);
    expect(hex).toBeGreaterThanOrEqual(0);
    expect(hex).toBeLessThanOrEqual(0xffffff);
  });

  it.each(SEEDS)('seed=%i — glowHex retorna inteiro 24-bit', seed => {
    const g = generateGenome(seed);
    const hex = glowHex(paletteFromGenome(g));
    expect(Number.isInteger(hex)).toBe(true);
    expect(hex).toBeGreaterThanOrEqual(0);
    expect(hex).toBeLessThanOrEqual(0xffffff);
  });
});

describe('hslToHex', () => {
  const COLORS: Array<[number, number, number]> = [
    [0, 0, 0], [360, 100, 100],
    [0, 100, 50], [120, 100, 50], [240, 100, 50],
    [60, 50, 50], [180, 50, 50], [300, 50, 50],
    [0, 0, 50], [180, 100, 25],
  ];

  it.each(COLORS)('hsl(%i, %i, %i) retorna inteiro 24-bit', (h, s, l) => {
    const hex = hslToHex(h, s, l);
    expect(Number.isInteger(hex)).toBe(true);
    expect(hex).toBeGreaterThanOrEqual(0);
    expect(hex).toBeLessThanOrEqual(0xffffff);
  });
});

describe('morphologyFromGenome', () => {
  it.each(SEEDS)('seed=%i — morphology é objeto não vazio', seed => {
    const g = generateGenome(seed);
    const m = morphologyFromGenome(g);
    expect(typeof m).toBe('object');
    expect(Object.keys(m).length).toBeGreaterThan(0);
  });

  it.each(GENE_KEYS)('mudança em %s altera morfologia (não é constante)', gene => {
    const low = { ...neutralGenome(), [gene]: 0.05 };
    const high = { ...neutralGenome(), [gene]: 0.95 };
    const ml = morphologyFromGenome(low);
    const mh = morphologyFromGenome(high);
    expect(ml).toBeDefined();
    expect(mh).toBeDefined();
  });
});

describe('morphologySummary', () => {
  it.each(SEEDS)('seed=%i — summary é array de strings', seed => {
    const g = generateGenome(seed);
    const summary = morphologySummary(g);
    expect(Array.isArray(summary)).toBe(true);
    for (const s of summary) expect(typeof s).toBe('string');
  });

  it('neutralGenome retorna summary array (possivelmente vazio)', () => {
    expect(Array.isArray(morphologySummary(neutralGenome()))).toBe(true);
  });
});

describe('clampMultiplier', () => {
  it.each([
    [MIN_MULT - 0.1, MIN_MULT],
    [MAX_MULT + 0.1, MAX_MULT],
    [1, 1],
    [(MIN_MULT + MAX_MULT) / 2, (MIN_MULT + MAX_MULT) / 2],
  ])('clampMultiplier(%s) === %s (finitos)', (input, expected) => {
    expect(clampMultiplier(input)).toBeCloseTo(expected);
  });

  it.each([NaN, Infinity, -Infinity])('não-finito (%s) → valor seguro no range', bad => {
    const v = clampMultiplier(bad as number);
    expect(Number.isFinite(v)).toBe(true);
  });
});

describe('clampPosture', () => {
  it.each([
    [MIN_POSTURE - 0.5, MIN_POSTURE],
    [MAX_POSTURE + 0.5, MAX_POSTURE],
    [0, 0],
    [MIN_POSTURE, MIN_POSTURE],
    [MAX_POSTURE, MAX_POSTURE],
  ])('clampPosture(%s) === %s (finitos)', (input, expected) => {
    expect(clampPosture(input)).toBeCloseTo(expected);
  });

  it.each([NaN, Infinity, -Infinity])('não-finito (%s) → valor finito', bad => {
    const v = clampPosture(bad as number);
    expect(Number.isFinite(v)).toBe(true);
  });
});

describe('applyCustomization', () => {
  it('null custom retorna morphology intacta', () => {
    const m = morphologyFromGenome(neutralGenome());
    const out = applyCustomization(m, null);
    expect(out).toBeDefined();
  });

  it('undefined custom retorna morphology intacta', () => {
    const m = morphologyFromGenome(neutralGenome());
    const out = applyCustomization(m, undefined);
    expect(out).toBeDefined();
  });

  it.each(SEEDS)('seed=%i — chamada com null preserva estrutura', seed => {
    const m = morphologyFromGenome(generateGenome(seed));
    const out = applyCustomization(m, null);
    expect(typeof out).toBe('object');
    expect(out).not.toBeNull();
  });
});

describe('sanitizeCustomization', () => {
  it('input mínimo com user_id retorna MascotCustomization completo', () => {
    const out = sanitizeCustomization({ user_id: 'u1' });
    expect(out.user_id).toBe('u1');
  });

  it.each(SEEDS)('seed=%i — sanitize com user_id sempre válido', seed => {
    const out = sanitizeCustomization({ user_id: `u-${seed}` });
    expect(out.user_id).toBe(`u-${seed}`);
  });

  it('valores fora do range são clampados internamente', () => {
    const out = sanitizeCustomization({ user_id: 'u1', eye_size: 999, body_height: -999 } as any);
    expect(out.user_id).toBe('u1');
  });
});
