/**
 * Performance benchmarks headless — pipeline DNA -> morphInfluences.
 *
 * Por que vitest e nao tinybench:
 *   Vitest ja roda em CI e tem reporter. Suficiente pra catch regressao
 *   gritante (>10x slowdown). Para perf fina usar @vitest/bench em
 *   slice futuro.
 *
 * Estrategia:
 *   - Mede ms total pra rodar N iteracoes de um pipeline tipico.
 *   - Threshold conservador (3x do "esperado") pra evitar flakiness em
 *     CI compartilhada — falha so pega regressao gritante.
 *   - Reporta wall-clock pra log.
 */

import { describe, expect, it } from 'vitest';
import { applyCustomization } from '@/lib/dna/customization';
import { generateGenome } from '@/lib/dna/genome';
import { morphologyFromGenome } from '@/lib/dna/morphology';
import {
  morphInfluencesFromMorphology,
  mergeMorphInfluences,
} from '@/lib/dna/morphInfluences';
import {
  aggregateVisualImpact,
  applyMutationVisualImpact,
} from '@/lib/dna/mutations';
import { personalityMorphBias } from '@/lib/dna/personalityMorphBias';
import { THEME_PRESETS, blendN, blendPresets } from '@/lib/dna/themePresets';

const N = 1000;
// Thresholds generous — focused on catastrophic regressions, not micro-perf.
const PIPELINE_MAX_MS = 1500;
const BLEND_MAX_MS = 500;
const BLEND_N_MAX_MS = 800;

describe('perf: pipeline DNA -> morphInfluences', () => {
  it(`${N} iteracoes do pipeline rodam em < ${PIPELINE_MAX_MS}ms`, () => {
    const start = performance.now();
    for (let i = 0; i < N; i++) {
      const dna = generateGenome(i);
      const base = morphologyFromGenome(dna);
      const withCustom = applyCustomization(base, null);
      const impact = aggregateVisualImpact([]);
      const withMut = applyMutationVisualImpact(withCustom, impact);
      const baseInf = morphInfluencesFromMorphology(withMut);
      mergeMorphInfluences(baseInf, personalityMorphBias('calmo'));
    }
    const elapsed = performance.now() - start;
    console.log(`[perf] pipeline x${N}: ${elapsed.toFixed(1)}ms (${(elapsed / N).toFixed(3)}ms/iter)`);
    expect(elapsed).toBeLessThan(PIPELINE_MAX_MS);
  });

  it(`${N} iteracoes de blendPresets rodam em < ${BLEND_MAX_MS}ms`, () => {
    const a = THEME_PRESETS[0];
    const b = THEME_PRESETS[1] ?? a;
    const start = performance.now();
    for (let i = 0; i < N; i++) {
      blendPresets(a, b, (i % 100) / 100);
    }
    const elapsed = performance.now() - start;
    console.log(`[perf] blendPresets x${N}: ${elapsed.toFixed(1)}ms (${(elapsed / N).toFixed(3)}ms/iter)`);
    expect(elapsed).toBeLessThan(BLEND_MAX_MS);
  });

  it(`${N} iteracoes de blendN(5) rodam em < ${BLEND_N_MAX_MS}ms`, () => {
    const slots = THEME_PRESETS.slice(0, 5).map((p, idx) => ({
      preset: p,
      weight: 0.1 + idx * 0.1,
    }));
    const start = performance.now();
    for (let i = 0; i < N; i++) {
      blendN(slots);
    }
    const elapsed = performance.now() - start;
    console.log(`[perf] blendN(5) x${N}: ${elapsed.toFixed(1)}ms (${(elapsed / N).toFixed(3)}ms/iter)`);
    expect(elapsed).toBeLessThan(BLEND_N_MAX_MS);
  });
});
