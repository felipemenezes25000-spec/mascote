/**
 * Genótipo + histórico → fenótipo visual discreto + morfologia contínua.
 */

import { morphologyFromGenome } from '@/lib/dna/morphology';
import { paletteFromGenome } from '@/lib/dna/palette';
import { applyMutationVisualImpact, aggregateVisualImpact, type UnlockedMutation } from '@/lib/dna/mutations';
import { mulberry32 } from '@/lib/dna/genome';
import type { MascotMood, MascotPhase } from '@/types';
import type { BehaviorHistory, Genotype, MacroPhaseId, Phenotype, PhenotypeSlots } from './EvolutionTypes';
import { PHENOTYPE_CATALOG_SIZES } from './EvolutionMath';
import { macroPhaseFromMascotPhase } from './EvolutionMilestones';
import { applyHabitVisualBias } from './EvolutionRules';

function slotIndex(rng: () => number, size: number, offset: number): number {
  return Math.floor(rng() * size + offset) % size;
}

export function generatePhenotypeSlots(
  genotype: Genotype,
  behaviorHistory: BehaviorHistory,
  microLevel: number,
): PhenotypeSlots {
  const rng = mulberry32(genotype.seed ^ microLevel);
  const habitBias = behaviorHistory.dominantHabits[0];
  let offset = habitBias ? habitBias.charCodeAt(0) % 3 : 0;

  return {
    bodyType: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.bodyType, offset),
    bodyScale: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.bodyScale, microLevel % 4),
    posture: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.posture, offset),
    expression: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.expression, 0),
    eyeType: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.eyeType, offset),
    mouthType: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.mouthType, 0),
    auraType: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.auraType, microLevel % 5),
    textureType: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.textureType, 0),
    colorPalette: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.colorPalette, genotype.seed % 7),
    bodyPattern: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.bodyPattern, offset),
    accessorySet: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.accessorySet, 0),
    particleStyle: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.particleStyle, microLevel % 3),
    environmentId: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.environmentId, 0),
    animationSet: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.animationSet, offset),
    personalityFlavor: slotIndex(rng, PHENOTYPE_CATALOG_SIZES.personalityFlavor, 0),
    rarityTier: Math.min(
      PHENOTYPE_CATALOG_SIZES.rarityTier - 1,
      { comum: 0, incomum: 1, raro: 2, lendario: 4 }[genotype.initialRarity],
    ),
  };
}

export function generatePhenotype(
  genotype: Genotype,
  mascotPhase: MascotPhase,
  mood: MascotMood,
  behaviorHistory: BehaviorHistory,
  microEvolutionLevel: number,
  unlockedMutations: UnlockedMutation[] = [],
): Phenotype {
  const slots = generatePhenotypeSlots(genotype, behaviorHistory, microEvolutionLevel);
  let morphology = morphologyFromGenome(genotype.genome);
  const palette = paletteFromGenome(genotype.genome);
  const impact = aggregateVisualImpact(unlockedMutations.map(m => m.mutation_id));
  morphology = applyMutationVisualImpact(morphology, impact);

  const displayModifiers = applyHabitVisualBias(behaviorHistory, microEvolutionLevel);

  return {
    slots,
    morphology,
    palette,
    macroPhase: macroPhaseFromMascotPhase(mascotPhase),
    microEvolutionLevel,
    activeMutations: unlockedMutations,
    mood,
    displayModifiers,
  };
}
