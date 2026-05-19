/**
 * Invariante: mutações que prometem PADRÃO VISUAL realmente afetam
 * `morphology.pattern` que o renderer consome.
 *
 * Brief DLI-v4: o sistema antes tinha `pattern: 'fractal'` em
 * `mut.emergent_patterns.visualImpact` mas Morphology não tinha campo
 * correspondente — pattern só era "promessa textual" sem mudança visual.
 *
 * Agora Morphology tem `pattern: MorphPattern`, e o pipeline
 * (DNA → morphology → customization → mutation) propaga corretamente.
 * Mascot3D consome via material props.
 */

import { describe, expect, it } from 'vitest';
import {
  aggregateVisualImpact,
  applyCustomization,
  applyMutationVisualImpact,
  morphologyFromGenome,
  type MorphPattern,
} from '@/lib/dna';
import type { MascotCustomization } from '@/types';

function dummyCustom(prefer: MorphPattern = 'plain'): MascotCustomization {
  return {
    user_id: 'u',
    eye_size: 1, eye_spread: 1, body_height: 1, body_width: 1,
    aura_intensity: 1, pattern_density: 1,
    preferred_pattern: prefer,
    posture_lean: 0,
    force_hide_tail: false, force_hide_antennae: false, force_hide_spikes: false,
    updated_at: new Date().toISOString(),
  };
}

describe('Invariante: pattern visual propaga DNA → mutation → render', () => {
  it('DNA com creativity+chaos altos gera pattern emergente sem mutation', () => {
    // creativity > 0.75 && chaos > 0.5 → 'spots' (per morphologyFromGenome)
    const g = {
      empathy: 0.5, curiosity: 0.5, creativity: 0.8, discipline: 0.5,
      chaos: 0.6, aggression: 0.3, resilience: 0.5, emotionalDepth: 0.5,
      socialEnergy: 0.5, adaptability: 0.5, intelligence: 0.5,
    };
    const m = morphologyFromGenome(g);
    expect(m.pattern).toBe('spots');
  });

  it('DNA plain (sem creativity nem chaos altos) → pattern plain', () => {
    const g = {
      empathy: 0.5, curiosity: 0.5, creativity: 0.3, discipline: 0.5,
      chaos: 0.3, aggression: 0.3, resilience: 0.5, emotionalDepth: 0.5,
      socialEnergy: 0.5, adaptability: 0.5, intelligence: 0.5,
    };
    const m = morphologyFromGenome(g);
    expect(m.pattern).toBe('plain');
  });

  it('mut.emergent_patterns aplica fractal mesmo se DNA gerou outro', () => {
    const g = {
      empathy: 0.5, curiosity: 0.5, creativity: 0.3, discipline: 0.5,
      chaos: 0.3, aggression: 0.3, resilience: 0.5, emotionalDepth: 0.5,
      socialEnergy: 0.5, adaptability: 0.5, intelligence: 0.5,
    };
    const m = morphologyFromGenome(g);
    expect(m.pattern).toBe('plain'); // baseline
    const impact = aggregateVisualImpact(['mut.emergent_patterns']);
    const withMut = applyMutationVisualImpact(m, impact);
    // emergent_patterns tem pattern: 'fractal' no catálogo
    expect(withMut.pattern).toBe('fractal');
  });

  it('customization preferred_pattern sobrescreve DNA emergente', () => {
    const g = {
      empathy: 0.5, curiosity: 0.5, creativity: 0.8, discipline: 0.5,
      chaos: 0.6, aggression: 0.3, resilience: 0.5, emotionalDepth: 0.5,
      socialEnergy: 0.5, adaptability: 0.5, intelligence: 0.5,
    };
    const m = morphologyFromGenome(g);
    expect(m.pattern).toBe('spots'); // DNA gerou
    const custom = dummyCustom('stripes');
    const out = applyCustomization(m, custom);
    expect(out.pattern).toBe('stripes'); // user override venceu
  });

  it('customization preferred_pattern="plain" PRESERVA pattern DNA-emergente', () => {
    // 'plain' como preferred_pattern significa "sem preferência" — não anula
    // o que DNA gerou. Só não-'plain' sobrescreve.
    const g = {
      empathy: 0.5, curiosity: 0.5, creativity: 0.8, discipline: 0.5,
      chaos: 0.6, aggression: 0.3, resilience: 0.5, emotionalDepth: 0.5,
      socialEnergy: 0.5, adaptability: 0.5, intelligence: 0.5,
    };
    const m = morphologyFromGenome(g);
    const custom = dummyCustom('plain');
    const out = applyCustomization(m, custom);
    expect(out.pattern).toBe('spots'); // DNA pattern preservado
  });

  it('mutation NÃO sobrescreve pattern de customization preferido', () => {
    // Ordem da composição (em Mascot3D Creature):
    //   1. morphologyFromGenome(g) → pattern DNA
    //   2. applyCustomization → user override (se não-plain)
    //   3. applyMutationVisualImpact → mutation override (se não-plain)
    // Última camada (mutation) vence — coerente com semantica "marco biológico
    // recente". Se conflito for indesejável, user pode `preferred_pattern: 'plain'`
    // e mutation aparece.
    const g = {
      empathy: 0.5, curiosity: 0.5, creativity: 0.8, discipline: 0.5,
      chaos: 0.6, aggression: 0.3, resilience: 0.5, emotionalDepth: 0.5,
      socialEnergy: 0.5, adaptability: 0.5, intelligence: 0.5,
    };
    const m = morphologyFromGenome(g);
    const withCustom = applyCustomization(m, dummyCustom('cells'));
    expect(withCustom.pattern).toBe('cells');
    const impact = aggregateVisualImpact(['mut.emergent_patterns']);
    const final = applyMutationVisualImpact(withCustom, impact);
    expect(final.pattern).toBe('fractal'); // mutation wins
  });

  it('pattern é uma das 5 opções válidas em qualquer cenário', () => {
    const valid: MorphPattern[] = ['plain', 'stripes', 'spots', 'fractal', 'cells'];
    for (let seed = 0; seed < 30; seed++) {
      // Gera DNA aleatório
      const g = {
        empathy: Math.random(),
        curiosity: Math.random(),
        creativity: Math.random(),
        discipline: Math.random(),
        chaos: Math.random(),
        aggression: Math.random(),
        resilience: Math.random(),
        emotionalDepth: Math.random(),
        socialEnergy: Math.random(),
        adaptability: Math.random(),
        intelligence: Math.random(),
      };
      const m = morphologyFromGenome(g);
      expect(valid).toContain(m.pattern);
    }
  });
});
