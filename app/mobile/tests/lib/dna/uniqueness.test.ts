/**
 * Invariante: dois usuários NUNCA geram mascotes idênticos.
 *
 * Mesmo escolhendo a MESMA personalidade, o seed do user_id (FNV-1a hash)
 * gera variação procedural via mulberry32 → genomes distintos → morfologia
 * distinta → palette distinta.
 *
 * Sem isso, o brief de "Digital Living Identity" colapsa — produto vira
 * skin reskin trivial.
 *
 * Property test com fast-check: gera 200 pares de seeds aleatórios e prova
 * que TODOS produzem genomes distinguíveis (delta total > epsilon).
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  GENE_KEYS,
  genomeFromPreset,
  genomesEqual,
  type Genome,
} from '@/lib/dna/genome';
import { genomeForPersonality } from '@/lib/dna/personalities';
import { morphologyFromGenome } from '@/lib/dna/morphology';
import { paletteFromGenome } from '@/lib/dna/palette';
import type { Personality } from '@/types';

const PERSONALITIES: Personality[] = ['calmo', 'motivador', 'fofo', 'sabio'];

function totalDelta(a: Genome, b: Genome): number {
  let sum = 0;
  for (const k of GENE_KEYS) sum += Math.abs(a[k] - b[k]);
  return sum;
}

describe('Invariante: dois usuários NUNCA geram mascotes idênticos', () => {
  it('mesma personalidade + seeds diferentes → genomes distintos (sample)', () => {
    for (const p of PERSONALITIES) {
      const preset = genomeForPersonality(p);
      const a = genomeFromPreset(12345, preset, 0.1);
      const b = genomeFromPreset(67890, preset, 0.1);
      expect(genomesEqual(a, b)).toBe(false);
      expect(totalDelta(a, b)).toBeGreaterThan(0.05);
    }
  });

  it('property: 200 pares de seeds → todos distintos', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PERSONALITIES),
        fc.integer({ min: 1, max: 0x7fffffff }),
        fc.integer({ min: 1, max: 0x7fffffff }),
        (p, sA, sB) => {
          if (sA === sB) return; // seeds iguais geram mesma criatura — esperado
          const preset = genomeForPersonality(p);
          const a = genomeFromPreset(sA, preset, 0.1);
          const b = genomeFromPreset(sB, preset, 0.1);
          // Deve haver pelo menos algum gene diferente (delta > 1e-6)
          expect(totalDelta(a, b)).toBeGreaterThan(1e-6);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('morfologia também difere — não só DNA invisível', () => {
    const preset = genomeForPersonality('calmo');
    const a = genomeFromPreset(111, preset, 0.1);
    const b = genomeFromPreset(222, preset, 0.1);
    const mA = morphologyFromGenome(a);
    const mB = morphologyFromGenome(b);
    // Cada gene afeta múltiplos params — distância morfológica > 0
    const morphDelta = Math.abs(mA.eyeSize - mB.eyeSize)
      + Math.abs(mA.bodyHeightStretch - mB.bodyHeightStretch)
      + Math.abs(mA.auraOpacity - mB.auraOpacity);
    expect(morphDelta).toBeGreaterThan(0);
  });

  it('palette também difere — duas criaturas visualmente distinguíveis', () => {
    const preset = genomeForPersonality('motivador');
    const a = genomeFromPreset(111, preset, 0.1);
    const b = genomeFromPreset(222, preset, 0.1);
    const pA = paletteFromGenome(a);
    const pB = paletteFromGenome(b);
    // Hue ou sat ou light deve diferir
    const hueDelta = Math.abs(pA.bodyHSL[0] - pB.bodyHSL[0]);
    const satDelta = Math.abs(pA.bodyHSL[1] - pB.bodyHSL[1]);
    const lightDelta = Math.abs(pA.bodyHSL[2] - pB.bodyHSL[2]);
    expect(hueDelta + satDelta + lightDelta).toBeGreaterThan(0);
  });

  it('mesmo seed → mesmo genome (determinismo da identidade)', () => {
    const preset = genomeForPersonality('fofo');
    const a = genomeFromPreset(42, preset, 0.1);
    const b = genomeFromPreset(42, preset, 0.1);
    expect(genomesEqual(a, b)).toBe(true);
  });

  it('variance=0 → genome = preset exato (sem variação)', () => {
    const preset = genomeForPersonality('sabio');
    const a = genomeFromPreset(42, preset, 0);
    expect(genomesEqual(a, preset, 1e-9)).toBe(true);
  });
});
