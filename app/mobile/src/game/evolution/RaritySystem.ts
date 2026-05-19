/**
 * Sistema de raridade procedural — tier visual + labels.
 */

import type { Genome } from '@/lib/dna/genome';
import type { BehaviorHistory } from './EvolutionTypes';

export type RarityTier = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';

const TIER_ORDER: RarityTier[] = ['comum', 'incomum', 'raro', 'epico', 'lendario'];

export function genomeRarityScore(genome: Genome): number {
  const values = Object.values(genome);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, v) => a + (v - avg) ** 2, 0) / values.length;
  return avg * 0.7 + Math.sqrt(variance) * 0.3;
}

export function computeRarityTier(
  genome: Genome,
  history: BehaviorHistory,
  microLevel: number,
): RarityTier {
  let score = genomeRarityScore(genome);
  score += Math.min(0.15, history.currentStreak * 0.005);
  score += Math.min(0.1, microLevel * 0.02);
  score += Math.min(0.08, history.recoveries * 0.02);

  if (score > 0.88) return 'lendario';
  if (score > 0.78) return 'epico';
  if (score > 0.65) return 'raro';
  if (score > 0.52) return 'incomum';
  return 'comum';
}

export function rarityTierIndex(tier: RarityTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function rarityLabel(tier: RarityTier): string {
  switch (tier) {
    case 'comum': return 'Comum';
    case 'incomum': return 'Incomum';
    case 'raro': return 'Raro';
    case 'epico': return 'Épico';
    case 'lendario': return 'Lendário';
  }
}
