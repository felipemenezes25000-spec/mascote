/**
 * Ponte genoma → parâmetros de simulação.
 * Resilience desacelera decay; emotionalDepth amplifica drift de humor.
 */

import type { Genome } from '@/lib/dna/genome';

export interface SimGenomeParams {
  /** Decay de energy por hora ausente (0.5–2.5). */
  energyDecayPerHour: number;
  /** Sensibilidade de mood a energy baixa (0.3–1.0). */
  moodSensitivity: number;
  /** Threshold de horas para evento "while you were away". */
  awayMomentThresholdHours: number;
}

const DECAY_BASE = 1.2;
const DECAY_RESILIENCE_FACTOR = 0.8;

export function genomeToSimParams(genome: Genome): SimGenomeParams {
  const resilience = genome.resilience;
  const emotionalDepth = genome.emotionalDepth;
  const energyDecayPerHour = Math.max(
    0.5,
    DECAY_BASE - resilience * DECAY_RESILIENCE_FACTOR,
  );
  const moodSensitivity = 0.3 + emotionalDepth * 0.7;
  const awayMomentThresholdHours = 4 + genome.adaptability * 4;
  return { energyDecayPerHour, moodSensitivity, awayMomentThresholdHours };
}
