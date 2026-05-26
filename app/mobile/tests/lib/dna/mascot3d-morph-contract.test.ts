/**
 * Tests do contrato morphInfluences pro renderer Mascot3D procedural.
 *
 * Mascot3D (R3F procedural) agora computa morphInfluences via o mesmo
 * pipeline que Mascot3DAsset/Unity usam. Esses tests garantem que o
 * pipeline isolado em helpers devolve dicts consistentes pros 3 tracks
 * (procedural + asset + unity) recebem a mesma fonte de truth.
 */

import { describe, expect, it } from 'vitest';
import { morphologyFromGenome } from '@/lib/dna/morphology';
import { applyCustomization } from '@/lib/dna/customization';
import {
  aggregateVisualImpact,
  applyMutationVisualImpact,
} from '@/lib/dna/mutations';
import {
  morphInfluencesFromMorphology,
  mergeMorphInfluences,
} from '@/lib/dna/morphInfluences';
import { personalityMorphBias } from '@/lib/dna/personalityMorphBias';
import { generateGenome } from '@/lib/dna/genome';

function buildInfluences(opts: {
  seed: number;
  customization?: Parameters<typeof applyCustomization>[1];
  mutationIds?: string[];
  personality?: Parameters<typeof personalityMorphBias>[0];
}) {
  const dna = generateGenome(opts.seed);
  const base = morphologyFromGenome(dna);
  const withCustom = applyCustomization(base, opts.customization ?? null);
  const impact = aggregateVisualImpact(opts.mutationIds ?? []);
  const withMut = applyMutationVisualImpact(withCustom, impact);
  const baseInf = morphInfluencesFromMorphology(withMut);
  return opts.personality
    ? mergeMorphInfluences(baseInf, personalityMorphBias(opts.personality))
    : baseInf;
}

describe('Mascot3D procedural: contrato morphInfluences', () => {
  it('pipeline produz um dict nao-vazio pra um DNA generico', () => {
    const inf = buildInfluences({ seed: 1 });
    expect(Object.keys(inf).length).toBeGreaterThan(0);
    for (const v of Object.values(inf)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('determinismo: mesmo seed + custom + mutation -> mesmo dict', () => {
    const a = buildInfluences({ seed: 42, mutationIds: ['m1'] });
    const b = buildInfluences({ seed: 42, mutationIds: ['m1'] });
    expect(a).toEqual(b);
  });

  it('personality bias nao viola bounds [0,1]', () => {
    // personality bias eh sutil (<=0.20 per principio inviolavel) e pode
    // nao diferir do neutro em todas as keys pra qualquer seed. Aqui
    // garantimos apenas o bound — composability ja eh coberta pelos
    // tests de mergeMorphInfluences em outro arquivo.
    for (const p of ['calmo', 'motivador', 'sabio'] as const) {
      const inf = buildInfluences({ seed: 7, personality: p });
      for (const [key, v] of Object.entries(inf)) {
        expect(v, `${p}/${key}`).toBeGreaterThanOrEqual(0);
        expect(v, `${p}/${key}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('customization extrema empurra weights mas nao quebra bounds', () => {
    const inf = buildInfluences({
      seed: 1,
      customization: {
        user_id: 'u',
        eye_size: 1.3,
        eye_spread: 1.0,
        body_height: 0.7,
        body_width: 1.3,
        aura_intensity: 1.3,
        pattern_density: 0.7,
        preferred_pattern: 'plain',
        posture_lean: 0,
        force_hide_tail: false,
        force_hide_antennae: false,
        force_hide_spikes: false,
        updated_at: new Date().toISOString(),
      },
    });
    for (const [key, v] of Object.entries(inf)) {
      expect(v, `${key} should be in [0,1]`).toBeGreaterThanOrEqual(0);
      expect(v, `${key} should be in [0,1]`).toBeLessThanOrEqual(1);
    }
  });
});
