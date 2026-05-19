/**
 * Testes da narrativa DNA.
 * Critério principal: NUNCA narra com vocabulário científico (DNA/gene/genoma).
 */

import { describe, it, expect } from 'vitest';
import {
  applyManyDrifts,
  emergentMaturity,
  generateGenome,
  neutralGenome,
  tellDnaStory,
  GENE_KEYS,
} from '@/lib/dna';
import type { HabitKind } from '@/types';

describe('tellDnaStory', () => {
  it('retorna null quando não há mudança', () => {
    const g = generateGenome(42);
    expect(tellDnaStory({ mascotName: 'Lulu', prev: g, next: g })).toBeNull();
  });

  it('narra mudança positiva', () => {
    const g0 = generateGenome(42);
    const g1 = applyManyDrifts(g0, Array(10).fill({ habit: 'reading' as HabitKind, intensity: 1 }));
    const story = tellDnaStory({ mascotName: 'Lulu', prev: g0, next: g1 });
    expect(story).not.toBeNull();
    expect(story!.headline.length).toBeGreaterThan(0);
    expect(story!.body.length).toBeGreaterThan(0);
    expect(story!.quote.length).toBeGreaterThan(0);
  });

  it('VOCABULÁRIO: nunca usa terminologia técnica nas frases', () => {
    const g0 = neutralGenome();
    const g1 = applyManyDrifts(g0, Array(20).fill({ habit: 'journaling' as HabitKind, intensity: 1 }));
    const story = tellDnaStory({ mascotName: 'Lulu', prev: g0, next: g1 });
    if (!story) return;
    const text = (story.headline + ' ' + story.body + ' ' + story.quote).toLowerCase();
    const taboo = ['dna', 'genoma', 'gene', 'mutação', 'mutation', 'cromossomo', 'allele'];
    for (const t of taboo) {
      expect(text).not.toContain(t);
    }
  });

  it('headline inclui o nome do mascote', () => {
    const g0 = neutralGenome();
    const g1 = applyManyDrifts(g0, Array(20).fill({ habit: 'breath' as HabitKind, intensity: 1 }));
    const story = tellDnaStory({ mascotName: 'Aro', prev: g0, next: g1 });
    expect(story?.headline).toContain('Aro');
  });
});

describe('emergentMaturity', () => {
  it('retorna valor em [0, 1]', () => {
    const m = emergentMaturity(generateGenome(42));
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(1);
  });

  it('genoma neutro retorna ~0.5', () => {
    const m = emergentMaturity(neutralGenome());
    expect(m).toBeGreaterThan(0.4);
    expect(m).toBeLessThan(0.6);
  });
});
