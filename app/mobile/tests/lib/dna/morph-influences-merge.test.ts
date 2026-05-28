/**
 * mergeMorphInfluences + personality bias + mutation boosts.
 *
 * Testes da composição em camadas:
 *   base (DNA+custom) → +mutation boosts → +personality bias → final
 *
 * Invariantes:
 *  - Resultado sempre clamped [0, 1]
 *  - Boost negativo que zera key remove ela (payload mínimo)
 *  - Boost em key inexistente cria
 *  - Pares mutually exclusive ainda podem se VIOLAR após boost (ex:
 *    base.eye_big + boost.eye_small = ambos > 0). Isso é aceito —
 *    o renderer 2D aplica clamp/merge conforme mergeMorphInfluences.
 */

import { describe, expect, it } from 'vitest';
import {
  mergeMorphInfluences,
  type MorphInfluences,
} from '@/lib/dna/morphInfluences';
import { personalityMorphBias } from '@/lib/dna/personalityMorphBias';
import { aggregateVisualImpact, NEUTRAL_VISUAL_IMPACT } from '@/lib/dna/mutations';

describe('mergeMorphInfluences', () => {
  it('boosts vazios mantêm base intacta', () => {
    const base: MorphInfluences = { eye_big: 0.5, body_tall: 0.3 };
    expect(mergeMorphInfluences(base, undefined)).toEqual(base);
    expect(mergeMorphInfluences(base, {})).toEqual(base);
  });

  it('boost adiciona em key existente (clamp 1)', () => {
    const base: MorphInfluences = { eye_big: 0.5 };
    const out = mergeMorphInfluences(base, { eye_big: 0.8 });
    expect(out.eye_big).toBe(1); // clamped
  });

  it('boost negativo que zera REMOVE a key (payload mínimo)', () => {
    const base: MorphInfluences = { eye_big: 0.3, body_tall: 0.5 };
    const out = mergeMorphInfluences(base, { eye_big: -0.3 });
    expect('eye_big' in out).toBe(false);
    expect(out.body_tall).toBe(0.5);
  });

  it('boost positivo cria key nova', () => {
    const base: MorphInfluences = { eye_big: 0.5 };
    const out = mergeMorphInfluences(base, { pattern_dense: 0.4 });
    expect(out.pattern_dense).toBe(0.4);
    expect(out.eye_big).toBe(0.5);
  });

  it('Infinity / NaN em boost são ignorados', () => {
    const base: MorphInfluences = { eye_big: 0.4 };
    const out = mergeMorphInfluences(base, { eye_big: Infinity, body_tall: NaN });
    expect(out.eye_big).toBe(0.4);
    expect('body_tall' in out).toBe(false);
  });

  it('não muta a base original', () => {
    const base: MorphInfluences = { eye_big: 0.4 };
    const before = JSON.stringify(base);
    mergeMorphInfluences(base, { eye_big: 0.3 });
    expect(JSON.stringify(base)).toBe(before);
  });
});

describe('personalityMorphBias', () => {
  it('retorna boosts pra cada personality', () => {
    const personalities = ['calmo', 'motivador', 'fofo', 'sabio'] as const;
    for (const p of personalities) {
      const bias = personalityMorphBias(p);
      expect(Object.keys(bias).length).toBeGreaterThan(0);
      for (const v of Object.values(bias)) {
        expect(Math.abs(v)).toBeLessThanOrEqual(0.25); // boosts sutis
      }
    }
  });

  it('retorna cópia (não mutável)', () => {
    const a = personalityMorphBias('calmo');
    const b = personalityMorphBias('calmo');
    expect(a).toEqual(b);
    a.posture_back = 999;
    expect(personalityMorphBias('calmo').posture_back).not.toBe(999);
  });

  it('cada personality tem assinatura visual distinta', () => {
    const c = personalityMorphBias('calmo');
    const m = personalityMorphBias('motivador');
    expect(c).not.toEqual(m);
  });
});

describe('aggregateVisualImpact morphInfluenceBoosts', () => {
  it('NEUTRAL_VISUAL_IMPACT inclui morphInfluenceBoosts vazio', () => {
    expect(NEUTRAL_VISUAL_IMPACT.morphInfluenceBoosts).toEqual({});
  });

  it('mut.deep_eyes propaga eye_big boost', () => {
    const agg = aggregateVisualImpact(['mut.deep_eyes']);
    expect(agg.morphInfluenceBoosts.eye_big).toBeGreaterThan(0);
  });

  it('mut.structural_firmness propaga body_wide + body_short boosts', () => {
    const agg = aggregateVisualImpact(['mut.structural_firmness']);
    expect(agg.morphInfluenceBoosts.body_wide).toBeGreaterThan(0);
    expect(agg.morphInfluenceBoosts.body_short).toBeGreaterThan(0);
  });

  it('múltiplas mutations SOMAM o boost de mesma key', () => {
    const agg = aggregateVisualImpact(['mut.deep_eyes', 'mut.structural_firmness']);
    // deep_eyes contribui eye_big (~0.3); structural_firmness não toca em eye_big
    expect(agg.morphInfluenceBoosts.eye_big).toBeGreaterThan(0);
    expect(agg.morphInfluenceBoosts.body_wide).toBeGreaterThan(0);
    expect(agg.morphInfluenceBoosts.body_short).toBeGreaterThan(0);
  });

  it('mutation sem morphInfluenceBoosts não quebra agregação', () => {
    // mut.reactive_antennae só tem morphologyMultipliers, sem boosts
    const agg = aggregateVisualImpact(['mut.reactive_antennae']);
    expect(agg.morphInfluenceBoosts).toBeDefined();
    expect(Object.keys(agg.morphInfluenceBoosts).length).toBe(0);
  });

  it('composição: base + mutation boosts + personality bias', () => {
    const base: MorphInfluences = { eye_big: 0.2 };
    const mutBoosts = aggregateVisualImpact(['mut.deep_eyes']).morphInfluenceBoosts;
    const persBias = personalityMorphBias('calmo');

    const step1 = mergeMorphInfluences(base, mutBoosts);
    expect(step1.eye_big).toBeGreaterThan(0.2); // mutation empurrou
    expect(step1.eye_big).toBeLessThanOrEqual(1);

    const step2 = mergeMorphInfluences(step1, persBias);
    // calmo tem eye_big +0.08 → step1 + 0.08 (clamped)
    expect(step2.eye_big).toBeGreaterThanOrEqual(step1.eye_big ?? 0);
    expect(step2.eye_big).toBeLessThanOrEqual(1);
    // calmo também tem posture_back e body_short que não existiam
    expect(step2.posture_back).toBeGreaterThan(0);
    expect(step2.body_short).toBeGreaterThan(0);
  });
});
