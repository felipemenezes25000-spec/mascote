/**
 * morphInfluences — derive blend shape weights from final Morphology.
 *
 * Invariantes:
 *  - Todos os weights em [0, 1]
 *  - Apenas keys com weight > 0 incluídas (payload mínimo)
 *  - Pares mutually exclusive: nunca eye_big E eye_small juntos
 *  - Multiplier neutro (1.0) → não inclui nenhum dos dois
 */

import { describe, expect, it } from 'vitest';
import { morphInfluencesFromMorphology, MORPH_INFLUENCE_KEYS } from '@/lib/dna/morphInfluences';
import { morphologyFromGenome } from '@/lib/dna/morphology';
import { generateGenome } from '@/lib/dna/genome';

describe('morphInfluencesFromMorphology', () => {
  it('weights SEMPRE em [0, 1]', () => {
    for (let seed = 0; seed < 100; seed++) {
      const dna = generateGenome(`seed-${seed}`);
      const morph = morphologyFromGenome(dna);
      const influences = morphInfluencesFromMorphology(morph);
      for (const [key, value] of Object.entries(influences)) {
        expect(value, `${key}`).toBeGreaterThan(0);
        expect(value, `${key}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keys apenas do catálogo MORPH_INFLUENCE_KEYS', () => {
    const dna = generateGenome('test');
    const morph = morphologyFromGenome(dna);
    const influences = morphInfluencesFromMorphology(morph);
    for (const key of Object.keys(influences)) {
      expect(MORPH_INFLUENCE_KEYS).toContain(key as (typeof MORPH_INFLUENCE_KEYS)[number]);
    }
  });

  it('pares são mutually exclusive (eye_big XOR eye_small)', () => {
    for (let seed = 0; seed < 100; seed++) {
      const dna = generateGenome(`pair-${seed}`);
      const morph = morphologyFromGenome(dna);
      const inf = morphInfluencesFromMorphology(morph);
      const hasBig = 'eye_big' in inf && (inf.eye_big ?? 0) > 0;
      const hasSmall = 'eye_small' in inf && (inf.eye_small ?? 0) > 0;
      expect(hasBig && hasSmall, `seed-${seed}`).toBe(false);

      const hasTall = 'body_tall' in inf && (inf.body_tall ?? 0) > 0;
      const hasShort = 'body_short' in inf && (inf.body_short ?? 0) > 0;
      expect(hasTall && hasShort, `seed-${seed}`).toBe(false);

      const hasWide = 'body_wide' in inf && (inf.body_wide ?? 0) > 0;
      const hasNarrow = 'body_narrow' in inf && (inf.body_narrow ?? 0) > 0;
      expect(hasWide && hasNarrow, `seed-${seed}`).toBe(false);
    }
  });

  it('multiplier extremo body_height=1.3 satura body_tall em 1.0', () => {
    const dna = generateGenome('extreme');
    const morph = morphologyFromGenome(dna);
    const extreme = { ...morph, bodyHeightStretch: 1.3 };
    const inf = morphInfluencesFromMorphology(extreme);
    expect(inf.body_tall).toBe(1);
    expect(inf.body_short ?? 0).toBe(0);
  });

  it('multiplier extremo body_width=0.7 satura body_narrow em 1.0', () => {
    const dna = generateGenome('extreme');
    const morph = morphologyFromGenome(dna);
    const extreme = { ...morph, bodyWidthSquash: 0.7 };
    const inf = morphInfluencesFromMorphology(extreme);
    expect(inf.body_narrow).toBe(1);
    expect(inf.body_wide ?? 0).toBe(0);
  });

  it('multiplier neutro (=1.0) NÃO inclui nem positive nem negative', () => {
    const dna = generateGenome('neutral');
    const morph = morphologyFromGenome(dna);
    const neutral = {
      ...morph,
      eyeSize: 1,
      bodyHeightStretch: 1,
      bodyWidthSquash: 1,
    };
    const inf = morphInfluencesFromMorphology(neutral);
    expect('eye_big' in inf).toBe(false);
    expect('eye_small' in inf).toBe(false);
    expect('body_tall' in inf).toBe(false);
    expect('body_short' in inf).toBe(false);
    expect('body_wide' in inf).toBe(false);
    expect('body_narrow' in inf).toBe(false);
  });

  it('aura_strong só aparece quando auraOpacity > 0.5', () => {
    const dna = generateGenome('aura');
    const morph = morphologyFromGenome(dna);
    const lowAura = { ...morph, auraOpacity: 0.3 };
    expect('aura_strong' in morphInfluencesFromMorphology(lowAura)).toBe(false);

    const highAura = { ...morph, auraOpacity: 0.8 };
    const inf = morphInfluencesFromMorphology(highAura);
    expect(inf.aura_strong).toBeGreaterThan(0);
    expect(inf.aura_strong).toBeLessThanOrEqual(1);
  });

  it('payload mínimo — só keys com weight > 0', () => {
    const dna = generateGenome('payload');
    const morph = morphologyFromGenome(dna);
    const inf = morphInfluencesFromMorphology(morph);
    for (const value of Object.values(inf)) {
      expect(value).toBeGreaterThan(0);
    }
  });

  it('determinismo: mesmo DNA → mesma influences', () => {
    const dna = generateGenome('determinism');
    const morphA = morphologyFromGenome(dna);
    const morphB = morphologyFromGenome(dna);
    expect(morphInfluencesFromMorphology(morphA)).toEqual(
      morphInfluencesFromMorphology(morphB),
    );
  });
});
