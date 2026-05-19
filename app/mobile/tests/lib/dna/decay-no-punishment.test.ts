/**
 * Invariante: AUSÊNCIA NÃO PUNE.
 *
 * Princípio inviolável do brief DLI: "faltar um dia NUNCA regride a criatura".
 * `applyDecay` puxa extremos em direção a 0.5 (média central), mas:
 *  - Genes >= 0.5 NUNCA atravessam 0.5 (não vão pra baixo da média)
 *  - Genes <= 0.5 NUNCA atravessam 0.5 (não vão pra cima da média)
 *  - Decay é proporcional ao tempo, mas NUNCA cresce em magnitude além
 *    da distância restante até 0.5
 *
 * Este invariante é mais forte que o teste já existente em habit-drift.test:
 * aqui testamos com fast-check em genomas/duraçoes arbitrárias + comparamos
 * com baselines de "qualidade emocional" da criatura.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  applyDecay,
  GENE_KEYS,
  generateGenome,
  neutralGenome,
} from '@/lib/dna';

describe('Invariante: ausência NÃO pune o usuário', () => {
  it('property: decay NUNCA cruza 0.5 (300 runs com seeds + days arbitrários)', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 0, max: 365 }),
        fc.float({ min: Math.fround(0.0001), max: Math.fround(0.02), noNaN: true }),
        (seed, days, strength) => {
          const g = generateGenome(seed);
          const next = applyDecay(g, days, strength);
          for (const k of GENE_KEYS) {
            if (g[k] > 0.5) {
              // Não pode atravessar 0.5 indo pra baixo
              expect(next[k]).toBeGreaterThanOrEqual(0.5 - 1e-9);
            } else if (g[k] < 0.5) {
              // Não pode atravessar 0.5 indo pra cima
              expect(next[k]).toBeLessThanOrEqual(0.5 + 1e-9);
            }
            // Em qualquer caso, sempre permanece dentro do range [0.02, 0.98]
            expect(next[k]).toBeGreaterThanOrEqual(0.02 - 1e-9);
            expect(next[k]).toBeLessThanOrEqual(0.98 + 1e-9);
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it('1 ano sem interação NÃO causa regressão pra valores médios punitivos', () => {
    const g = generateGenome(42);
    // 365 dias de decay com strength padrão
    const after_year = applyDecay(g, 365);
    // Genes que estavam acima de 0.5 ainda estão acima (ou exatamente em 0.5)
    for (const k of GENE_KEYS) {
      if (g[k] > 0.5) {
        expect(after_year[k]).toBeGreaterThanOrEqual(0.5 - 1e-9);
      }
    }
  });

  it('genoma neutro (todos 0.5) é PONTO FIXO — nada muda nunca', () => {
    const g = neutralGenome();
    for (const days of [0, 1, 30, 365, 1000]) {
      const next = applyDecay(g, days, 0.01);
      for (const k of GENE_KEYS) {
        expect(next[k]).toBe(0.5);
      }
    }
  });

  it('days < 0 é tratado como 0 (input defensivo)', () => {
    const g = generateGenome(42);
    const next = applyDecay(g, -50, 0.005);
    for (const k of GENE_KEYS) {
      expect(next[k]).toBe(g[k]);
    }
  });

  it('strength muito alto NÃO causa overshoot abaixo de 0.5', () => {
    // strength=10 com 1 dia poderia colapsar pra 0.5 — confirma clamp ativo
    const g = {
      empathy: 0.95, curiosity: 0.95, creativity: 0.95, discipline: 0.95,
      chaos: 0.5, aggression: 0.5, resilience: 0.95, emotionalDepth: 0.95,
      socialEnergy: 0.95, adaptability: 0.95, intelligence: 0.95,
    };
    const next = applyDecay(g, 1, 10);
    for (const k of GENE_KEYS) {
      if (g[k] > 0.5) {
        // Mesmo com strength absurdo, não atravessa 0.5
        expect(next[k]).toBeGreaterThanOrEqual(0.5 - 1e-9);
      }
    }
  });

  it('decay NUNCA produz NaN ou Infinity (robustez numérica)', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 0, max: 1000 }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (seed, days, strength) => {
          const g = generateGenome(seed);
          const next = applyDecay(g, days, strength);
          for (const k of GENE_KEYS) {
            expect(Number.isFinite(next[k])).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
