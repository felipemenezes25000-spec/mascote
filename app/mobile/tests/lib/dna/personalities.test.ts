/**
 * Testes dos presets de personalidade (Bipo/Zip/Lulu/Aro).
 * Valida que cada preset tem o caráter esperado.
 */

import { describe, it, expect } from 'vitest';
import {
  genomeForPersonality,
  listPersonalityPresets,
  MASCOT_TO_PERSONALITY,
  isGenome,
  getArchetype,
} from '@/lib/dna';

describe('presets de personalidade', () => {
  it('todas as 4 personalidades retornam genoma válido', () => {
    const ps = listPersonalityPresets();
    expect(ps.length).toBe(4);
    for (const { genome } of ps) {
      expect(isGenome(genome)).toBe(true);
    }
  });

  it('Bipo (calmo) tem empatia alta e agressão muito baixa', () => {
    const g = genomeForPersonality('calmo');
    expect(g.empathy).toBeGreaterThan(0.75);
    expect(g.aggression).toBeLessThan(0.15);
    expect(g.resilience).toBeGreaterThan(0.7);
  });

  it('Zip (motivador) tem energia social alta e curiosidade alta', () => {
    const g = genomeForPersonality('motivador');
    expect(g.socialEnergy).toBeGreaterThan(0.85);
    expect(g.curiosity).toBeGreaterThan(0.8);
  });

  it('Lulu (fofo) tem empatia máxima e profundidade emocional alta', () => {
    const g = genomeForPersonality('fofo');
    expect(g.empathy).toBeGreaterThan(0.9);
    expect(g.emotionalDepth).toBeGreaterThan(0.8);
    expect(g.aggression).toBeLessThan(0.1);
  });

  it('Aro (sábio) tem inteligência máxima e disciplina alta', () => {
    const g = genomeForPersonality('sabio');
    expect(g.intelligence).toBeGreaterThan(0.9);
    expect(g.discipline).toBeGreaterThan(0.75);
  });

  it('arquétipo bate com a essência da personalidade', () => {
    expect(getArchetype(genomeForPersonality('fofo')).key).toBe('empathy');
    expect(getArchetype(genomeForPersonality('sabio')).key).toBe('intelligence');
    expect(getArchetype(genomeForPersonality('motivador')).key).toBe('socialEnergy');
  });

  it('genomeForPersonality retorna cópia (não muta tabela)', () => {
    const a = genomeForPersonality('calmo');
    a.empathy = 0.1;
    const b = genomeForPersonality('calmo');
    expect(b.empathy).toBeGreaterThan(0.75);
  });

  it('MASCOT_TO_PERSONALITY mapeia corretamente', () => {
    expect(MASCOT_TO_PERSONALITY.Bipo).toBe('calmo');
    expect(MASCOT_TO_PERSONALITY.Zip).toBe('motivador');
    expect(MASCOT_TO_PERSONALITY.Lulu).toBe('fofo');
    expect(MASCOT_TO_PERSONALITY.Aro).toBe('sabio');
  });
});
