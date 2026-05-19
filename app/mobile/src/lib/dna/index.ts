/**
 * Barrel export para o módulo DNA procedural.
 * Toda consumidora externa importa daqui — facilita refator sem
 * vazamento de detalhes internos.
 */

export {
  GENE_KEYS,
  GENE_META,
  GENE_MIN,
  GENE_MAX,
  type Genome,
  type GeneKey,
  type GeneMeta,
  type ArchetypeKey,
  type Archetype,
  mulberry32,
  clampGene,
  generateGenome,
  genomeFromPreset,
  neutralGenome,
  isGenome,
  sanitizeGenome,
  genomesEqual,
  getArchetype,
  serializeGenome,
  deserializeGenome,
  hashGenome,
  generateCreatureName,
} from './genome';

export {
  genomeForPersonality,
  listPersonalityPresets,
  MASCOT_TO_PERSONALITY,
} from './personalities';

export {
  HABIT_GENE_MAP,
  type DriftInput,
  applyHabitDrift,
  applyManyDrifts,
  applyDecay,
  geneDelta,
  dominantChange,
} from './habitToGene';

export {
  type Palette,
  paletteFromGenome,
  hslToHex,
  bodyHex,
  accentHex,
  glowHex,
} from './palette';

export {
  type Morphology,
  morphologyFromGenome,
  morphologySummary,
} from './morphology';

export {
  moodScore,
  moodLabel,
  moodToLegacy,
  behaviorTraits,
} from './mood';

export {
  type DnaStory,
  tellDnaStory,
  emergentMaturity,
} from './stories';
