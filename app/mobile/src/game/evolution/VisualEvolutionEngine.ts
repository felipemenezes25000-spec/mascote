/**
 * Aplica camada visual de evolução sobre fenótipo base.
 */

import type { Genome } from '@/lib/dna/genome';
import type { Phenotype, PhenotypeSlots, BehaviorHistory, MicroEvolution } from './EvolutionTypes';
import { PHENOTYPE_CATALOG_SIZES } from './EvolutionMath';
import { computeRarityTier, rarityTierIndex } from './RaritySystem';

function modSlot(value: number, size: number, delta: number): number {
  return ((value + delta) % size + size) % size;
}

/** Modula slots discretos com microevoluções acumuladas. */
export function applyMicroEvolutionToSlots(
  slots: PhenotypeSlots,
  microEvolutions: readonly MicroEvolution[],
): PhenotypeSlots {
  if (microEvolutions.length === 0) return slots;
  const totalMag = microEvolutions.reduce((a, m) => a + m.magnitude, 0);
  const delta = Math.floor(totalMag * 3);
  return {
    ...slots,
    auraType: modSlot(slots.auraType, PHENOTYPE_CATALOG_SIZES.auraType, delta),
    particleStyle: modSlot(slots.particleStyle, PHENOTYPE_CATALOG_SIZES.particleStyle, delta % 5),
    expression: modSlot(slots.expression, PHENOTYPE_CATALOG_SIZES.expression, Math.floor(delta / 2)),
    textureType: modSlot(slots.textureType, PHENOTYPE_CATALOG_SIZES.textureType, delta % 4),
  };
}

export function enrichPhenotypeVisuals(
  phenotype: Phenotype,
  genome: Genome,
  history: BehaviorHistory,
  microEvolutions: readonly MicroEvolution[],
): Phenotype {
  const slots = applyMicroEvolutionToSlots(phenotype.slots, microEvolutions);
  const tier = computeRarityTier(
    genome,
    history,
    phenotype.microEvolutionLevel,
  );
  return {
    ...phenotype,
    slots: {
      ...slots,
      rarityTier: Math.min(
        PHENOTYPE_CATALOG_SIZES.rarityTier - 1,
        rarityTierIndex(tier),
      ),
    },
  };
}
