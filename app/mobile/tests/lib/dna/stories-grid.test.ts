/**
 * Grid de stories (narrativa de DNA) — tellDnaStory e emergentMaturity.
 *
 * Cada gene tem uma narrativa única — testamos que mudança isolada em
 * cada gene produz a story esperada, sem culpa, com headline/body/quote.
 */

import { describe, expect, it } from 'vitest';
import {
  GENE_KEYS,
  tellDnaStory,
  emergentMaturity,
  neutralGenome,
  generateGenome,
} from '@/lib/dna';
import type { Genome, GeneKey } from '@/lib/dna';

describe('tellDnaStory', () => {
  it('null quando prev e next são iguais', () => {
    const g = generateGenome(42);
    expect(tellDnaStory({ mascotName: 'X', prev: g, next: g })).toBeNull();
  });

  it.each(GENE_KEYS)('mudança POSITIVA em %s gera story', gene => {
    const prev = neutralGenome();
    const next: Genome = { ...neutralGenome(), [gene]: 0.9 };
    const story = tellDnaStory({ mascotName: 'Bipo', prev, next });
    expect(story).not.toBeNull();
    expect(story?.primaryGene).toBe(gene);
    expect(story?.headline).toMatch(/Bipo/);
    expect(story?.body).toMatch(/Bipo/);
  });

  it.each(GENE_KEYS)('mudança NEGATIVA em %s NÃO gera story (sem culpa)', gene => {
    const prev: Genome = { ...neutralGenome(), [gene]: 0.9 };
    const next: Genome = { ...neutralGenome(), [gene]: 0.5 };
    const story = tellDnaStory({ mascotName: 'Bipo', prev, next });
    expect(story).toBeNull();
  });

  it.each(GENE_KEYS)('mudança em %s — intensity entre 0 e 1', gene => {
    const prev = neutralGenome();
    const next: Genome = { ...neutralGenome(), [gene]: 0.9 };
    const story = tellDnaStory({ mascotName: 'X', prev, next });
    expect(story?.intensity).toBeGreaterThanOrEqual(0);
    expect(story?.intensity).toBeLessThanOrEqual(1);
  });

  it.each(GENE_KEYS)('mudança em %s — quote não vazia', gene => {
    const prev = neutralGenome();
    const next: Genome = { ...neutralGenome(), [gene]: 0.9 };
    const story = tellDnaStory({ mascotName: 'X', prev, next });
    expect(story?.quote.length).toBeGreaterThan(0);
  });

  it('daysOfCare é adicionado ao body quando presente', () => {
    const prev = neutralGenome();
    const next: Genome = { ...neutralGenome(), empathy: 0.9 };
    const story = tellDnaStory({ mascotName: 'Bipo', prev, next, daysOfCare: 7 });
    expect(story?.body).toMatch(/7 dias/);
  });

  it('sem daysOfCare, body não menciona "X dias de cuidado"', () => {
    const prev = neutralGenome();
    const next: Genome = { ...neutralGenome(), empathy: 0.9 };
    const story = tellDnaStory({ mascotName: 'Bipo', prev, next });
    expect(story?.body).not.toMatch(/dias de cuidado/);
  });

  it.each(GENE_KEYS)('story body NUNCA usa vocabulário de culpa para %s', gene => {
    const prev = neutralGenome();
    const next: Genome = { ...neutralGenome(), [gene]: 0.9 };
    const story = tellDnaStory({ mascotName: 'Bipo', prev, next });
    expect(story?.body).not.toMatch(/falha|falhou|culpa|abandonou|deve/i);
  });
});

describe('emergentMaturity', () => {
  it('genome neutro tem maturity em [0, 1]', () => {
    const m = emergentMaturity(neutralGenome());
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(1);
  });

  it.each([0, 1, 42, 100, 999, 12345])('seed=%i tem maturity em [0, 1]', seed => {
    const m = emergentMaturity(generateGenome(seed));
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(1);
  });

  it('genome muito desenvolvido tem maturity > 0.7', () => {
    const g: Genome = {
      ...neutralGenome(),
      discipline: 0.95,
      resilience: 0.95,
      intelligence: 0.95,
      emotionalDepth: 0.95,
      empathy: 0.95,
      adaptability: 0.95,
    };
    expect(emergentMaturity(g)).toBeGreaterThan(0.7);
  });

  it('genome muito imaturo tem maturity baixa', () => {
    const g: Genome = {
      ...neutralGenome(),
      discipline: 0.05,
      resilience: 0.05,
      intelligence: 0.05,
      emotionalDepth: 0.05,
      empathy: 0.05,
      adaptability: 0.05,
    };
    expect(emergentMaturity(g)).toBeLessThan(0.3);
  });

  it.each(['discipline', 'resilience', 'intelligence', 'emotionalDepth'] as GeneKey[])(
    'aumentar %s isoladamente aumenta a maturity',
    gene => {
      const low: Genome = { ...neutralGenome(), [gene]: 0.05 };
      const high: Genome = { ...neutralGenome(), [gene]: 0.95 };
      expect(emergentMaturity(high)).toBeGreaterThan(emergentMaturity(low));
    },
  );
});
