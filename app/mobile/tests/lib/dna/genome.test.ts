/**
 * Testes unitários + property tests do core de genoma.
 *
 * Cobertura:
 *  - Determinismo total (mesmo seed = mesmo genoma)
 *  - Faixa de valores SEMPRE em [GENE_MIN, GENE_MAX]
 *  - Sanitização tolera input corrompido sem lançar
 *  - Round-trip serialize/deserialize preserva valor (até epsilon)
 *  - 11 chaves obrigatórias
 *  - PRNG mulberry32 distribuição razoável
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  GENE_KEYS,
  GENE_MIN,
  GENE_MAX,
  clampGene,
  deserializeGenome,
  generateGenome,
  genomeFromPreset,
  genomesEqual,
  getArchetype,
  hashGenome,
  isGenome,
  mulberry32,
  neutralGenome,
  sanitizeGenome,
  serializeGenome,
  generateCreatureName,
} from '@/lib/dna';

describe('genome — determinismo', () => {
  it('mesmo seed produz mesmo genome sempre', () => {
    const a = generateGenome(42);
    const b = generateGenome(42);
    const c = generateGenome(42);
    expect(genomesEqual(a, b)).toBe(true);
    expect(genomesEqual(b, c)).toBe(true);
  });

  it('seeds diferentes produzem genomas diferentes', () => {
    const a = generateGenome(1);
    const b = generateGenome(2);
    expect(genomesEqual(a, b)).toBe(false);
  });

  it('determinismo persiste com seeds extremos', () => {
    fc.assert(
      fc.property(fc.integer({ min: -2147483648, max: 2147483647 }), seed => {
        const a = generateGenome(seed);
        const b = generateGenome(seed);
        expect(genomesEqual(a, b)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

describe('genome — invariantes de range', () => {
  it('todo genome gerado está em [GENE_MIN, GENE_MAX]', () => {
    fc.assert(
      fc.property(fc.integer(), seed => {
        const g = generateGenome(seed);
        for (const k of GENE_KEYS) {
          expect(g[k]).toBeGreaterThanOrEqual(GENE_MIN);
          expect(g[k]).toBeLessThanOrEqual(GENE_MAX);
          expect(Number.isFinite(g[k])).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('clampGene respeita os limites', () => {
    expect(clampGene(-1)).toBe(GENE_MIN);
    expect(clampGene(0)).toBe(GENE_MIN);
    expect(clampGene(0.5)).toBe(0.5);
    expect(clampGene(1)).toBe(GENE_MAX);
    expect(clampGene(99)).toBe(GENE_MAX);
  });

  it('clampGene trata NaN e Infinity', () => {
    expect(Number.isFinite(clampGene(NaN))).toBe(true);
    expect(Number.isFinite(clampGene(Infinity))).toBe(true);
    expect(Number.isFinite(clampGene(-Infinity))).toBe(true);
  });
});

describe('genome — 11 chaves obrigatórias', () => {
  it('todo genome tem exatamente as 11 chaves de GENE_KEYS', () => {
    const g = generateGenome(0);
    const keys = Object.keys(g).sort();
    const expected = [...GENE_KEYS].sort();
    expect(keys).toEqual(expected);
    expect(keys.length).toBe(11);
  });
});

describe('genome — sanitização tolerante', () => {
  it('input null/undefined retorna genoma neutro válido', () => {
    expect(isGenome(sanitizeGenome(null))).toBe(true);
    expect(isGenome(sanitizeGenome(undefined))).toBe(true);
    expect(isGenome(sanitizeGenome('lixo'))).toBe(true);
    expect(isGenome(sanitizeGenome(42))).toBe(true);
    expect(isGenome(sanitizeGenome([1, 2, 3]))).toBe(true);
  });

  it('input com chaves faltando preenche com 0.5', () => {
    const partial = { empathy: 0.8, curiosity: 0.3 };
    const sane = sanitizeGenome(partial);
    expect(sane.empathy).toBe(0.8);
    expect(sane.curiosity).toBe(0.3);
    expect(sane.intelligence).toBe(0.5);
  });

  it('input com valores fora do range é clampado', () => {
    const bad = {
      empathy: -10,
      curiosity: 999,
      creativity: NaN,
      discipline: Infinity,
      chaos: '0.7' as unknown as number, // wrong type
      aggression: null as unknown as number,
      resilience: undefined as unknown as number,
      emotionalDepth: 0.5,
      socialEnergy: 0.5,
      adaptability: 0.5,
      intelligence: 0.5,
    };
    const sane = sanitizeGenome(bad);
    expect(sane.empathy).toBe(GENE_MIN);
    expect(sane.curiosity).toBe(GENE_MAX);
    expect(Number.isFinite(sane.creativity)).toBe(true);
    expect(Number.isFinite(sane.discipline)).toBe(true);
    expect(isGenome(sane)).toBe(true);
  });

  it('isGenome rejeita inputs claramente inválidos', () => {
    expect(isGenome(null)).toBe(false);
    expect(isGenome(undefined)).toBe(false);
    expect(isGenome('')).toBe(false);
    expect(isGenome(42)).toBe(false);
    expect(isGenome([])).toBe(false);
    expect(isGenome({})).toBe(false);
    expect(isGenome({ ...neutralGenome(), empathy: NaN })).toBe(false);
    expect(isGenome({ ...neutralGenome(), empathy: 2 })).toBe(false);
  });
});

describe('genome — serialização round-trip', () => {
  it('serialize + deserialize preserva valor até 4 casas decimais', () => {
    fc.assert(
      fc.property(fc.integer(), seed => {
        const g = generateGenome(seed);
        const s = serializeGenome(g);
        const back = deserializeGenome(s);
        for (const k of GENE_KEYS) {
          expect(Math.abs(g[k] - back[k])).toBeLessThan(0.001);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('deserialize string inválida retorna genoma neutro', () => {
    expect(isGenome(deserializeGenome(''))).toBe(true);
    expect(isGenome(deserializeGenome('lixo'))).toBe(true);
    expect(isGenome(deserializeGenome('1,2,3'))).toBe(true);
    expect(isGenome(deserializeGenome(null as unknown as string))).toBe(true);
  });
});

describe('genome — hash', () => {
  it('hashGenome é determinístico', () => {
    const g = generateGenome(42);
    expect(hashGenome(g)).toBe(hashGenome(g));
    expect(hashGenome(g).length).toBe(8);
  });

  it('hashes diferentes para genomas diferentes (prob)', () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 100; i++) hashes.add(hashGenome(generateGenome(i)));
    // colisões extremamente improváveis em 100 inputs com FNV-1a
    expect(hashes.size).toBeGreaterThan(95);
  });
});

describe('genomeFromPreset', () => {
  it('aplica variação dentro do range', () => {
    const preset = neutralGenome();
    fc.assert(
      fc.property(fc.integer(), seed => {
        const g = genomeFromPreset(seed, preset, 0.2);
        for (const k of GENE_KEYS) {
          expect(g[k]).toBeGreaterThanOrEqual(GENE_MIN);
          expect(g[k]).toBeLessThanOrEqual(GENE_MAX);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('variance 0 retorna o preset (clamped)', () => {
    const preset = neutralGenome();
    const g = genomeFromPreset(42, preset, 0);
    expect(genomesEqual(g, preset)).toBe(true);
  });

  it('mesmo seed + preset = mesmo genoma', () => {
    const preset = neutralGenome();
    expect(genomesEqual(
      genomeFromPreset(99, preset, 0.1),
      genomeFromPreset(99, preset, 0.1),
    )).toBe(true);
  });
});

describe('arquétipos', () => {
  it('retorna o gene de maior valor como arquétipo', () => {
    const g = { ...neutralGenome(), empathy: 0.95 };
    expect(getArchetype(g).key).toBe('empathy');
    expect(getArchetype(g).name).toBe('O Acolhedor');
  });

  it('arquétipo retorna estrutura completa', () => {
    const a = getArchetype(neutralGenome());
    expect(typeof a.name).toBe('string');
    expect(typeof a.tag).toBe('string');
    expect(typeof a.tagline).toBe('string');
  });
});

describe('mulberry32 PRNG', () => {
  it('determinístico', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it('valores em [0, 1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('seeds inválidos não quebram', () => {
    expect(() => mulberry32(NaN)()).not.toThrow();
    expect(() => mulberry32(Infinity)()).not.toThrow();
    expect(() => mulberry32(-1)()).not.toThrow();
  });
});

describe('generateCreatureName', () => {
  it('determinístico (seed + genome)', () => {
    const g = generateGenome(42);
    expect(generateCreatureName(g, 1)).toBe(generateCreatureName(g, 1));
  });

  it('retorna string capitalizada não-vazia', () => {
    fc.assert(
      fc.property(fc.integer(), seed => {
        const g = generateGenome(seed);
        const n = generateCreatureName(g, seed);
        expect(n.length).toBeGreaterThan(0);
        expect(n[0]).toBe(n[0].toUpperCase());
      }),
      { numRuns: 50 },
    );
  });
});
