/**
 * Regras de modulação visual por hábitos — sem punição por inatividade.
 */

import type { HabitKind } from '@/types';
import type { BehaviorHistory, PhenotypeDisplayModifiers } from './EvolutionTypes';

const HABIT_VISUAL_WEIGHT: Partial<Record<HabitKind, Partial<PhenotypeDisplayModifiers>>> = {
  water: { glowMultiplier: 0.04, eyeBrightness: 0.03 },
  sleep: { calmAura: true, postureBias: 0.05, glowMultiplier: 0.03 },
  exercise: { activeEnergy: true, bodyFirmness: 0.06, postureBias: 0.04 },
  meditation: { zenParticles: true, calmAura: true, postureBias: 0.03 },
  breath: { calmAura: true, zenParticles: true },
  reading: { eyeBrightness: 0.04 },
  journaling: { eyeBrightness: 0.02, calmAura: true },
  outdoor: { activeEnergy: true, auraParticleBoost: 0.05 },
  sun: { glowMultiplier: 0.05, auraParticleBoost: 0.04 },
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Modificadores visuais derivados do histórico — sempre ≥ baseline, nunca punitivo. */
export function applyHabitVisualBias(
  history: BehaviorHistory,
  microLevel: number,
): PhenotypeDisplayModifiers {
  let glowMultiplier = 1 + microLevel * 0.015;
  let auraParticleBoost = microLevel * 0.02;
  let postureBias = 0;
  let eyeBrightness = 0;
  let bodyFirmness = 0;
  let calmAura = false;
  let activeEnergy = false;
  let zenParticles = false;
  let missedYouTone = history.failuresSinceLastActive >= 3 && history.recoveries === 0;

  for (const [habit, count] of Object.entries(history.habitCounts) as [HabitKind, number][]) {
    const weight = HABIT_VISUAL_WEIGHT[habit];
    if (!weight || count <= 0) continue;
    const factor = Math.min(1, count / 30);
    if (weight.glowMultiplier) glowMultiplier += weight.glowMultiplier * factor;
    if (weight.auraParticleBoost) auraParticleBoost += weight.auraParticleBoost * factor;
    if (weight.postureBias) postureBias += weight.postureBias * factor;
    if (weight.eyeBrightness) eyeBrightness += weight.eyeBrightness * factor;
    if (weight.bodyFirmness) bodyFirmness += weight.bodyFirmness * factor;
    if (weight.calmAura) calmAura = calmAura || factor > 0.15;
    if (weight.activeEnergy) activeEnergy = activeEnergy || factor > 0.15;
    if (weight.zenParticles) zenParticles = zenParticles || factor > 0.15;
  }

  if (history.currentStreak >= 7) glowMultiplier += 0.05;
  if (history.recoveries > 0) missedYouTone = false;

  return {
    glowMultiplier: clamp01(glowMultiplier - 1) + 1,
    auraParticleBoost: clamp01(auraParticleBoost),
    postureBias: clamp01(postureBias),
    eyeBrightness: clamp01(eyeBrightness),
    bodyFirmness: clamp01(bodyFirmness),
    calmAura,
    activeEnergy,
    zenParticles,
    missedYouTone,
  };
}

/** Hábitos dominantes ordenados por contagem (top 3). */
export function computeDominantHabits(
  counts: Partial<Record<HabitKind, number>>,
): HabitKind[] {
  return (Object.entries(counts) as [HabitKind, number][])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => h);
}
