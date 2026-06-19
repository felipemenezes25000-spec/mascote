export type {
  CreatureArchetype, BodyPlan, EarType, EyeType, SnoutType, TailType,
  WingType, CrownType, CreaturePattern, LimbType, CreatureSize, CreatureRarity,
  CreaturePalette, CreatureGenome, ArchetypeSpec,
} from './types';
export { ARCHETYPES, ARCHETYPE_IDS } from './archetypes';
export {
  archetypeFromGenome,
  countCoherentCreatures,
  creatureFingerprint,
  creatureGenomeFromDNA,
  PALETTE_BUCKETS,
  type CreatureOptions,
} from './species';
export {
  detectSpeciesDiscovery,
  getDiscoveredSpecies,
  recordSpeciesDiscovery,
  speciesDiscoveryToast,
  speciesStatus,
  type SpeciesStatus,
} from './discovery';
