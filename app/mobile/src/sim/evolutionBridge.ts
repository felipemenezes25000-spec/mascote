/**
 * Ponte simulação → evolução sutil.
 * Ausências longas, padrões de humor baixo e hábitos regulares influenciam genes levemente.
 */

import { clampGene } from '@/lib/dna/genome';
import type { Genome } from '@/lib/dna/genome';
import type { HabitKind, MascotMood } from '@/types';
import type { MissedHabit } from './habitBridge';

export interface AbsenceEvolutionInput {
  genome: Genome;
  absenceHours: number;
  mood: MascotMood;
}

export interface HabitEvolutionInput {
  genome: Genome;
  /** Hábitos com padrão regular (detectRegularHabits). */
  regularHabits: readonly HabitKind[];
  /** Hábitos perdidos durante ausência — informativo, sem punição genética. */
  missedHabits?: readonly MissedHabit[];
}

/** Mapeamento não-punitivo: hábito regular → gene que cresce levemente. */
const HABIT_GENE_NUDGE: Partial<Record<HabitKind, { gene: keyof Genome; delta: number }>> = {
  exercise: { gene: 'discipline', delta: 0.003 },
  sleep: { gene: 'resilience', delta: 0.002 },
  meditation: { gene: 'emotionalDepth', delta: 0.002 },
  breath: { gene: 'adaptability', delta: 0.002 },
  outdoor: { gene: 'curiosity', delta: 0.002 },
  sun: { gene: 'socialEnergy', delta: 0.002 },
  reading: { gene: 'intelligence', delta: 0.002 },
  journaling: { gene: 'empathy', delta: 0.002 },
  water: { gene: 'resilience', delta: 0.001 },
};

/**
 * Retorna genoma levemente ajustado após ausência longa, ou null se nada muda.
 * Princípio: sempre não-negativo — genes só sobem ou permanecem.
 */
export function nudgeGenomeFromAbsence(input: AbsenceEvolutionInput): Genome | null {
  const { genome, absenceHours, mood } = input;
  if (absenceHours < 48) return null;

  const next = { ...genome };
  let changed = false;

  // Criatura "adaptou" à solitude — adaptability sobe levemente.
  const adaptDelta = absenceHours >= 168 ? 0.006 : absenceHours >= 72 ? 0.004 : 0.002;
  const newAdapt = clampGene(next.adaptability + adaptDelta);
  if (newAdapt !== next.adaptability) {
    next.adaptability = newAdapt;
    changed = true;
  }

  // Humor baixo prolongado reforça emotionalDepth (percebe contraste depois).
  if (mood === 'triste' || mood === 'exausto') {
    const depthDelta = 0.003;
    const newDepth = clampGene(next.emotionalDepth + depthDelta);
    if (newDepth !== next.emotionalDepth) {
      next.emotionalDepth = newDepth;
      changed = true;
    }
  }

  return changed ? next : null;
}

/**
 * Nudge sutil baseado em hábitos regulares offline — reforça traços positivos.
 * Hábitos perdidos NÃO reduzem genes (sem culpa).
 */
export function nudgeGenomeFromHabits(input: HabitEvolutionInput): Genome | null {
  const { genome, regularHabits } = input;
  if (regularHabits.length === 0) return null;

  const next = { ...genome };
  let changed = false;

  for (const habit of regularHabits) {
    const mapping = HABIT_GENE_NUDGE[habit];
    if (!mapping) continue;
    const newVal = clampGene(next[mapping.gene] + mapping.delta);
    if (newVal !== next[mapping.gene]) {
      next[mapping.gene] = newVal;
      changed = true;
    }
  }

  return changed ? next : null;
}

export function mergeGenomeNudges(
  genome: Genome,
  ...nudges: (Genome | null)[]
): Genome | null {
  const next = { ...genome };
  let changed = false;
  for (const nudge of nudges) {
    if (!nudge) continue;
    for (const key of Object.keys(genome) as (keyof Genome)[]) {
      const merged = Math.max(next[key], nudge[key]);
      if (merged !== next[key]) changed = true;
      next[key] = merged;
    }
  }
  return changed ? next : null;
}
