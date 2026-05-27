/**
 * Matemática combinatória do sistema de evolução.
 * Prova que existem 1000+ combinações reais de slots discretos.
 */

import type { PhenotypeSlots } from './EvolutionTypes';

/** Cardinalidade de cada eixo visual independente no fenótipo. */
export const PHENOTYPE_CATALOG_SIZES = {
  bodyType: 10,
  bodyScale: 8,
  posture: 12,
  expression: 14,
  eyeType: 12,
  mouthType: 10,
  auraType: 15,
  textureType: 12,
  colorPalette: 20,
  bodyPattern: 20,
  accessorySet: 30,
  particleStyle: 18,
  environmentId: 10,
  animationSet: 20,
  personalityFlavor: 15,
  rarityTier: 5,
} as const satisfies Record<keyof PhenotypeSlots, number>;

const SLOT_KEYS = Object.keys(PHENOTYPE_CATALOG_SIZES) as (keyof PhenotypeSlots)[];

/**
 * Produto cartesiano dos slots discretos do fenótipo.
 * Não inclui variação contínua do genoma (11 genes) — isso multiplica ainda mais.
 */
export function calculateTotalEvolutionCombinations(): number {
  let total = 1;
  for (const key of SLOT_KEYS) {
    total *= PHENOTYPE_CATALOG_SIZES[key];
  }
  return total;
}

/** Combinações efetivas após aplicar histórico (microevoluções modulam slots). */
export function calculateEffectiveCombinations(microEvolutionCount: number): number {
  const base = calculateTotalEvolutionCombinations();
  // Guard contra NaN: Math.max(1, NaN)===NaN propaga e telemetria reportava
  // "evolução total: NaN" silenciosamente quando microEvolutionCount era
  // corrompido (mascot pré-migration, snapshot mal-importado).
  const n = Number.isFinite(microEvolutionCount) ? Math.max(0, microEvolutionCount) : 0;
  // Cada microevolução pode modular até 3 eixos (conservador)
  const microFactor = Math.max(1, n * 3);
  return base * microFactor;
}

/** Hash estável de um fenótipo para comparação/dedup. */
export function phenotypeFingerprint(slots: PhenotypeSlots): string {
  return SLOT_KEYS.map(k => slots[k]).join(':');
}
