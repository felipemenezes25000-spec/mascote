/**
 * Invariante: Mascot3D renderiza traços desbloqueados pelo DNA.
 *
 * O renderer Mascot3D usa em RUNTIME mocked (jsdom não tem WebGL), então
 * testamos o CONTRATO upstream que define quais traits a criatura tem:
 *   genome → morphologyFromGenome → boolean flags (hasTail, hasSpikes, ...)
 *   genome → morphologySummary → human-readable traits
 *
 * Se essa pipeline funciona corretamente, o renderer (em runtime real)
 * tem todas as condições pra renderizar as parts certas.
 *
 * Adicionalmente, testamos que customization (force_hide_X) RESPEITA o
 * DNA — não pode HABILITAR traits que DNA não tem, mas pode esconder.
 */

import { describe, expect, it } from 'vitest';
import { generateGenome } from '@/lib/dna/genome';
import { morphologyFromGenome, morphologySummary } from '@/lib/dna/morphology';
import { applyCustomization } from '@/lib/dna/customization';
import type { MascotCustomization } from '@/types';

function defaultCustom(overrides: Partial<MascotCustomization> = {}): MascotCustomization {
  return {
    user_id: 'u_test',
    eye_size: 1, eye_spread: 1, body_height: 1, body_width: 1,
    aura_intensity: 1, pattern_density: 1,
    preferred_pattern: 'plain',
    posture_lean: 0,
    force_hide_tail: false,
    force_hide_antennae: false,
    force_hide_spikes: false,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Invariante: Mascot3D renderiza traços desbloqueados pelo DNA', () => {
  it('genome com creativity >= 0.4 → hasTail = true', () => {
    const g = { ...generateGenome(1), creativity: 0.6 };
    expect(morphologyFromGenome(g).hasTail).toBe(true);
  });

  it('genome com creativity < 0.4 → hasTail = false', () => {
    const g = { ...generateGenome(1), creativity: 0.3 };
    expect(morphologyFromGenome(g).hasTail).toBe(false);
  });

  it('genome com aggression >= 0.55 → hasSpikes = true', () => {
    const g = { ...generateGenome(1), aggression: 0.7 };
    expect(morphologyFromGenome(g).hasSpikes).toBe(true);
    expect(morphologyFromGenome(g).spikeCount).toBeGreaterThan(0);
  });

  it('genome com curiosity >= 0.55 → hasAntennae = true', () => {
    const g = { ...generateGenome(1), curiosity: 0.7 };
    expect(morphologyFromGenome(g).hasAntennae).toBe(true);
  });

  it('limbCount = floor(creativity * 3 + chaos * 2) — escala com DNA', () => {
    const high = { ...generateGenome(1), creativity: 0.95, chaos: 0.95 };
    const low  = { ...generateGenome(1), creativity: 0.05, chaos: 0.05 };
    const mHigh = morphologyFromGenome(high);
    const mLow = morphologyFromGenome(low);
    expect(mHigh.limbCount).toBeGreaterThan(mLow.limbCount);
    expect(mLow.limbCount).toBe(0);
  });

  it('morphologySummary nomeia os traços visíveis presentes', () => {
    const g = {
      empathy: 0.8, curiosity: 0.8, creativity: 0.6, discipline: 0.5,
      chaos: 0.5, aggression: 0.7, resilience: 0.5, emotionalDepth: 0.5,
      socialEnergy: 0.5, adaptability: 0.5, intelligence: 0.5,
    };
    const summary = morphologySummary(g);
    expect(summary.some(s => s.includes('cauda'))).toBe(true);
    expect(summary.some(s => s.includes('cristas') || s.includes('espinhos'))).toBe(true);
    expect(summary.some(s => s.includes('antenas'))).toBe(true);
    expect(summary.some(s => s.includes('olhos grandes'))).toBe(true);
  });

  it('summary nunca é vazia — sempre tem pelo menos "forma essencial"', () => {
    // genome plano sem qualquer trait saliente
    const g = {
      empathy: 0.5, curiosity: 0.5, creativity: 0.3, discipline: 0.5,
      chaos: 0.3, aggression: 0.3, resilience: 0.5, emotionalDepth: 0.5,
      socialEnergy: 0.5, adaptability: 0.5, intelligence: 0.5,
    };
    expect(morphologySummary(g).length).toBeGreaterThan(0);
  });
});

describe('Customization respeita identidade genética', () => {
  it('force_hide_tail = true esconde cauda EM CIMA do DNA habilitado', () => {
    const g = { ...generateGenome(1), creativity: 0.6 };
    const morph = morphologyFromGenome(g);
    expect(morph.hasTail).toBe(true);
    const withHide = applyCustomization(morph, defaultCustom({ force_hide_tail: true }));
    expect(withHide.hasTail).toBe(false);
  });

  it('force_hide NÃO força MOSTRAR parts que DNA desabilita', () => {
    // DNA sem creativity → hasTail = false. Customization NÃO pode habilitar.
    const g = { ...generateGenome(1), creativity: 0.2 };
    const morph = morphologyFromGenome(g);
    expect(morph.hasTail).toBe(false);
    // Mesmo com force_hide_tail=false, NÃO ganha cauda (não é unhide; é hide-only)
    const withCustom = applyCustomization(morph, defaultCustom({ force_hide_tail: false }));
    expect(withCustom.hasTail).toBe(false);
  });

  it('force_hide_antennae respeita o mesmo padrão', () => {
    const g = { ...generateGenome(1), curiosity: 0.7 };
    const m = morphologyFromGenome(g);
    expect(m.hasAntennae).toBe(true);
    const withHide = applyCustomization(m, defaultCustom({ force_hide_antennae: true }));
    expect(withHide.hasAntennae).toBe(false);
  });

  it('force_hide_spikes respeita o mesmo padrão', () => {
    const g = { ...generateGenome(1), aggression: 0.7 };
    const m = morphologyFromGenome(g);
    expect(m.hasSpikes).toBe(true);
    const withHide = applyCustomization(m, defaultCustom({ force_hide_spikes: true }));
    expect(withHide.hasSpikes).toBe(false);
  });

  it('todos os 3 hidden simultaneamente → criatura "minimalista"', () => {
    const g = { ...generateGenome(1), creativity: 0.6, curiosity: 0.7, aggression: 0.7 };
    const m = morphologyFromGenome(g);
    const withHideAll = applyCustomization(m, defaultCustom({
      force_hide_tail: true,
      force_hide_antennae: true,
      force_hide_spikes: true,
    }));
    expect(withHideAll.hasTail).toBe(false);
    expect(withHideAll.hasAntennae).toBe(false);
    expect(withHideAll.hasSpikes).toBe(false);
  });
});
