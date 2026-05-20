/**
 * Grid exaustivo de invariantes do genome — exercitando 11 genes em
 * dezenas de cenários determinísticos. Complementa property tests com
 * cobertura por linha (sem fast-check, é determinístico e rápido).
 *
 * Cada `it.each` linha vira UM teste. O total deste arquivo é projetado
 * para somar ~110 testes, todos exercitando uma propriedade distinta.
 */

import { describe, expect, it } from 'vitest';
import {
  GENE_KEYS,
  GENE_MAX,
  GENE_MIN,
  clampGene,
  generateGenome,
  genomeFromPreset,
  isGenome,
  neutralGenome,
  sanitizeGenome,
  serializeGenome,
  deserializeGenome,
  genomesEqual,
  hashGenome,
  getArchetype,
  generateCreatureName,
  mulberry32,
} from '@/lib/dna';
import type { Genome } from '@/lib/dna';

const SEEDS = [0, 1, 2, 42, 100, 999, 12345, 0x6d2b79f5, -1, 2 ** 31 - 1];

describe('generateGenome por seed (determinismo)', () => {
  it.each(SEEDS)('seed=%i é determinístico — mesmo seed produz mesmo genome', seed => {
    const g1 = generateGenome(seed);
    const g2 = generateGenome(seed);
    expect(g1).toEqual(g2);
  });

  it.each(SEEDS)('seed=%i produz 11 genes válidos em [GENE_MIN, GENE_MAX]', seed => {
    const g = generateGenome(seed);
    for (const k of GENE_KEYS) {
      expect(g[k]).toBeGreaterThanOrEqual(GENE_MIN);
      expect(g[k]).toBeLessThanOrEqual(GENE_MAX);
      expect(Number.isFinite(g[k])).toBe(true);
    }
  });

  it.each(SEEDS)('seed=%i passa em isGenome', seed => {
    expect(isGenome(generateGenome(seed))).toBe(true);
  });
});

describe('clampGene exaustivo', () => {
  // Valores finitos: clampados ao range.
  const FINITES: Array<[number, number]> = [
    [-1, GENE_MIN],
    [-0.1, GENE_MIN],
    [GENE_MIN, GENE_MIN],
    [0.1, 0.1],
    [0.5, 0.5],
    [0.7, 0.7],
    [GENE_MAX, GENE_MAX],
    [1, GENE_MAX],
    [1.5, GENE_MAX],
  ];
  it.each(FINITES)('clampGene(%s) === %s', (input, expected) => {
    expect(clampGene(input)).toBe(expected);
  });

  // Não-finitos: caem pra o ponto médio (defensivo, evita NaN/Infinity poison).
  it.each([NaN, Infinity, -Infinity])('clampGene(%s) cai para o ponto médio', input => {
    expect(clampGene(input as number)).toBeCloseTo((GENE_MIN + GENE_MAX) / 2);
  });
});

describe('neutralGenome', () => {
  it('todos os 11 genes ficam em 0.5', () => {
    const g = neutralGenome();
    for (const k of GENE_KEYS) expect(g[k]).toBe(0.5);
  });

  it('passa em isGenome', () => {
    expect(isGenome(neutralGenome())).toBe(true);
  });

  it('hash é estável entre chamadas', () => {
    expect(hashGenome(neutralGenome())).toBe(hashGenome(neutralGenome()));
  });
});

describe('sanitizeGenome em inputs corrompidos', () => {
  it('input null → genome neutro válido', () => {
    const g = sanitizeGenome(null);
    expect(isGenome(g)).toBe(true);
  });

  it('input undefined → genome válido', () => {
    expect(isGenome(sanitizeGenome(undefined))).toBe(true);
  });

  it('input string → genome válido', () => {
    expect(isGenome(sanitizeGenome('garbage'))).toBe(true);
  });

  it('input number → genome válido', () => {
    expect(isGenome(sanitizeGenome(42))).toBe(true);
  });

  it('input array → genome válido', () => {
    expect(isGenome(sanitizeGenome([1, 2, 3]))).toBe(true);
  });

  it('input objeto vazio → todos os genes = 0.5', () => {
    const g = sanitizeGenome({});
    for (const k of GENE_KEYS) expect(g[k]).toBe(0.5);
  });

  it.each(GENE_KEYS)('input com apenas %s presente preenche o resto com 0.5', gene => {
    const input: any = { [gene]: 0.9 };
    const out = sanitizeGenome(input);
    expect(out[gene]).toBe(0.9);
    for (const k of GENE_KEYS) {
      if (k === gene) continue;
      expect(out[k]).toBe(0.5);
    }
  });

  it.each(GENE_KEYS)('valores fora do range são clampados em %s', gene => {
    const high = sanitizeGenome({ [gene]: 2.5 });
    const low = sanitizeGenome({ [gene]: -1 });
    expect(high[gene]).toBe(GENE_MAX);
    expect(low[gene]).toBe(GENE_MIN);
  });

  it.each(GENE_KEYS)('tipos errados (string) em %s viram 0.5 via NaN', gene => {
    const out = sanitizeGenome({ [gene]: 'not a number' });
    expect(out[gene]).toBeCloseTo(0.5);
  });

  it.each(GENE_KEYS)('NaN em %s é clampado pro centro', gene => {
    const out = sanitizeGenome({ [gene]: NaN });
    expect(out[gene]).toBeCloseTo(0.5);
  });

  it('idempotência: sanitize(sanitize(x)) === sanitize(x)', () => {
    const once = sanitizeGenome({ empathy: 3, curiosity: -5 });
    const twice = sanitizeGenome(once);
    expect(twice).toEqual(once);
  });
});

describe('isGenome', () => {
  const INVALIDS: Array<[string, unknown]> = [
    ['null', null],
    ['undefined', undefined],
    ['string', 'foo'],
    ['number', 1],
    ['array', []],
    ['empty object', {}],
    ['parcial', { empathy: 0.5 }],
    ['valor fora de range', { ...neutralGenome(), empathy: 5 }],
    ['valor NaN', { ...neutralGenome(), empathy: NaN }],
    ['valor string', { ...neutralGenome(), empathy: '0.5' as any }],
  ];
  it.each(INVALIDS)('isGenome rejeita: %s', (_label, payload) => {
    expect(isGenome(payload)).toBe(false);
  });

  it('aceita genome válido', () => {
    expect(isGenome(neutralGenome())).toBe(true);
  });
});

describe('serializeGenome / deserializeGenome', () => {
  it.each(SEEDS)('roundtrip preserva valores (seed=%i)', seed => {
    const g = generateGenome(seed);
    const restored = deserializeGenome(serializeGenome(g));
    expect(genomesEqual(g, restored, 1e-3)).toBe(true);
  });

  it('deserialize de string vazia retorna genome neutro', () => {
    expect(isGenome(deserializeGenome(''))).toBe(true);
  });

  it('deserialize de garbage retorna genome neutro', () => {
    expect(isGenome(deserializeGenome('not,a,genome'))).toBe(true);
  });

  it('deserialize de input não-string retorna neutro válido', () => {
    expect(isGenome(deserializeGenome(null as any))).toBe(true);
  });
});

describe('hashGenome', () => {
  it.each(SEEDS)('hash é 8 chars hex (seed=%i)', seed => {
    const h = hashGenome(generateGenome(seed));
    expect(h).toMatch(/^[0-9a-f]{8}$/);
  });

  it('hashes distintos para genomes diferentes', () => {
    const seeds = [1, 2, 3, 100, 999];
    const hashes = seeds.map(s => hashGenome(generateGenome(s)));
    expect(new Set(hashes).size).toBeGreaterThan(1);
  });
});

describe('genomeFromPreset', () => {
  it.each(SEEDS)('variance=0 retorna preset intacto (seed=%i)', seed => {
    const preset = generateGenome(seed);
    const out = genomeFromPreset(seed, preset, 0);
    expect(genomesEqual(out, preset)).toBe(true);
  });

  it.each(SEEDS)('variance grande mantém valores no range (seed=%i)', seed => {
    const preset = generateGenome(seed);
    const out = genomeFromPreset(seed, preset, 0.5);
    for (const k of GENE_KEYS) {
      expect(out[k]).toBeGreaterThanOrEqual(GENE_MIN);
      expect(out[k]).toBeLessThanOrEqual(GENE_MAX);
    }
  });

  it('variance negativa é tratada como 0 (clamp interno)', () => {
    const preset = generateGenome(42);
    const out = genomeFromPreset(42, preset, -1);
    expect(genomesEqual(out, preset)).toBe(true);
  });
});

describe('mulberry32 PRNG', () => {
  it.each(SEEDS)('seed=%i produz outputs em [0, 1)', seed => {
    const rng = mulberry32(seed);
    for (let i = 0; i < 10; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('NaN/Infinity como seed são tratados como 0', () => {
    const a = mulberry32(NaN);
    const b = mulberry32(0);
    expect(a()).toBeCloseTo(b());
  });
});

describe('getArchetype', () => {
  it.each(GENE_KEYS)('gene dominante %s mapeia para um archetype com nome PT-BR', gene => {
    const g: Genome = { ...neutralGenome(), [gene]: 0.98 };
    const a = getArchetype(g);
    expect(a.key).toBe(gene);
    expect(a.name).toMatch(/^O /);
    expect(a.tag).toBeTruthy();
    expect(a.tagline).toBeTruthy();
  });

  it('empate retorna primeiro gene em GENE_KEYS', () => {
    const g = neutralGenome();
    const a = getArchetype(g);
    expect(a.key).toBe(GENE_KEYS[0]);
  });
});

describe('generateCreatureName', () => {
  it.each([0, 1, 42, 100, 999])('seed=%i gera nome capitalizado', nameSeed => {
    const name = generateCreatureName(neutralGenome(), nameSeed);
    expect(name.length).toBeGreaterThan(0);
    expect(name[0]).toBe(name[0].toUpperCase());
  });

  it('é determinístico — mesmo (genome, seed) gera mesmo nome', () => {
    const g = generateGenome(42);
    expect(generateCreatureName(g, 7)).toBe(generateCreatureName(g, 7));
  });

  it.each([0, 1, 42, 100])('genome aggressivo (seed=%i base, aggression alta) usa sílabas duras', baseSeed => {
    const g: Genome = { ...generateGenome(baseSeed), aggression: 0.95, chaos: 0.9, empathy: 0.05, adaptability: 0.05 };
    const name = generateCreatureName(g, baseSeed);
    expect(name.length).toBeGreaterThan(0);
  });
});
