/**
 * Mapeamento hábito → drift de genes.
 *
 * **Princípio inviolável:** sem culpa.
 * Drift SEMPRE é não-negativo. Faltar um hábito NUNCA regride a criatura.
 * Cumprir um hábito reforça os genes correspondentes em proporção à
 * intensidade (0..1).
 *
 * Validações ativas via property tests em `tests/lib/dna/habit-drift.test.ts`:
 *   - drift sempre ≥ 0 para qualquer input
 *   - drift é determinístico
 *   - aplicar 7 drifts seguidos não excede GENE_MAX
 *   - genome resultante sempre válido
 */

import { GENE_KEYS, GENE_MAX, GENE_MIN, clampGene } from './genome';
import type { GeneKey, Genome } from './genome';
import type { HabitKind } from '@/types';

/**
 * Cada hábito reforça 1-3 genes específicos. Mapeamento construído com
 * base nas práticas de bem-estar: respiração ↔ empatia/discipline,
 * leitura ↔ inteligência/curiosidade, etc.
 *
 * Valores são drift máximo por dia (intensity=1). Calibrados pra que
 * 30 dias consistentes reforcem um gene em ~0.3 (visivelmente).
 */
export const HABIT_GENE_MAP: Record<HabitKind, Partial<Record<GeneKey, number>>> = {
  sleep:      { discipline: 0.012, resilience: 0.014, emotionalDepth: 0.008 },
  water:      { resilience: 0.010, adaptability: 0.008 },
  exercise:   { resilience: 0.014, adaptability: 0.010, socialEnergy: 0.008 },
  meditation: { empathy: 0.010, emotionalDepth: 0.014, discipline: 0.010 },
  reading:    { intelligence: 0.014, curiosity: 0.012, creativity: 0.008 },
  journaling: { emotionalDepth: 0.014, empathy: 0.010, intelligence: 0.006 },
  breath:     { empathy: 0.010, emotionalDepth: 0.012, discipline: 0.008 },
  outdoor:    { socialEnergy: 0.010, adaptability: 0.010, curiosity: 0.008 },
  sun:        { resilience: 0.008, socialEnergy: 0.010, emotionalDepth: 0.006 },
};

export interface DriftInput {
  habit: HabitKind;
  /** Intensidade do cumprimento — 0 (nada) a 1 (completo). */
  intensity?: number;
}

/**
 * Aplica drift de um hábito sobre um Genome.
 *
 * @returns Novo genome (imutável) com os genes correspondentes reforçados.
 *          NUNCA reduz nenhum gene. NUNCA excede GENE_MAX.
 */
export function applyHabitDrift(genome: Genome, input: DriftInput): Genome {
  const intensity = clampIntensity(input.intensity);
  if (intensity === 0) return { ...genome };

  const effects = HABIT_GENE_MAP[input.habit];
  if (!effects) return { ...genome };

  const next = { ...genome };
  for (const k of GENE_KEYS) {
    const delta = effects[k];
    if (typeof delta !== 'number' || delta <= 0) continue;
    next[k] = clampGene(next[k] + delta * intensity);
  }
  return next;
}

/**
 * Aplica múltiplos drifts em ordem. Usado pra simular "passar N dias com
 * hábitos cuidados" no botão de evolução acelerada.
 */
export function applyManyDrifts(genome: Genome, inputs: DriftInput[]): Genome {
  let cur = genome;
  for (const d of inputs) {
    cur = applyHabitDrift(cur, d);
  }
  return cur;
}

/**
 * Decay temporal — aplica uma leve degradação centrada na média (0.5).
 * Usado pra que criaturas que ficam dias sem interação NÃO regridam
 * (sem culpa), mas que seus genes ligeiramente "esfriem" voltando à média.
 *
 * Decay também é NÃO-PUNITIVO: nunca empurra um gene pra baixo de 0.5,
 * só puxa extremos em direção ao centro. Genes acima de 0.5 caem um
 * pouquinho; genes abaixo de 0.5 sobem um pouquinho.
 *
 * @param genome Genome a degradar.
 * @param daysIdle Dias desde a última interação.
 * @param strength Default 0.0008 por dia (visível só após meses).
 */
export function applyDecay(
  genome: Genome,
  daysIdle: number,
  strength = 0.0008,
): Genome {
  const days = Math.max(0, Math.floor(daysIdle));
  if (days === 0) return { ...genome };
  const totalDelta = strength * days;
  const next = { ...genome };
  for (const k of GENE_KEYS) {
    const v = next[k];
    // Decay nunca atravessa 0.5 (princípio: sem culpa). Para totalDelta grande
    // (ex: 0.065 com strength=0.005 × 13 dias), `v - totalDelta` overshoot-ava
    // pra baixo de 0.5; clamp explícito a 0.5 corrige sem alterar o range
    // global [GENE_MIN, GENE_MAX].
    if (v > 0.5) {
      next[k] = Math.max(0.5, v - totalDelta);
    } else if (v < 0.5) {
      next[k] = Math.min(0.5, v + totalDelta);
    }
    // v === 0.5: ponto fixo, inalterado.
  }
  return next;
}

function clampIntensity(i: number | undefined): number {
  if (typeof i !== 'number' || !Number.isFinite(i)) return 1;
  if (i < 0) return 0;
  if (i > 1) return 1;
  return i;
}

/**
 * Calcula quanto o gene `k` mudou entre dois genomas.
 * Positivo = fortaleceu. Negativo = enfraqueceu. Útil para narrativa.
 */
export function geneDelta(prev: Genome, next: Genome, k: GeneKey): number {
  return next[k] - prev[k];
}

/** Retorna o gene que mais mudou (em valor absoluto). */
export function dominantChange(
  prev: Genome,
  next: Genome,
): { gene: GeneKey; delta: number } | null {
  let bestGene: GeneKey | null = null;
  let bestAbs = 0;
  for (const k of GENE_KEYS) {
    const d = next[k] - prev[k];
    const ad = Math.abs(d);
    if (ad > bestAbs) {
      bestAbs = ad;
      bestGene = k;
    }
  }
  if (!bestGene || bestAbs < 1e-6) return null;
  return { gene: bestGene, delta: next[bestGene] - prev[bestGene] };
}

// Re-export pra facilitar imports em consumidores
export { GENE_MIN, GENE_MAX };
