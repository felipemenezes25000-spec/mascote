/**
 * Gera genótipo único a partir de seed + personalização inicial.
 */

import {
  generateGenome,
  genomeFromPreset,
  mulberry32,
  type Genome,
} from '@/lib/dna/genome';
import { genomeForPersonality } from '@/lib/dna/personalities';
import type { Personality } from '@/types';
import type { BondType, Genotype, PersonalizationInput, UserGoal } from './EvolutionTypes';

const ARCHETYPES = [
  'lumina', 'terra', 'aqua', 'vento', 'cosmos', 'flora', 'cristal', 'brasa',
] as const;

const LATENT_TRAITS = [
  'brilho_matinal', 'calma_profunda', 'curiosidade_viva', 'forca_suave',
  'sonho_lucido', 'raiz_firme', 'luz_interna', 'maré_gentil',
] as const;

const MUTATION_PREDISPOSITION = [
  'aura_liquida', 'cristais_pele', 'folhas_suaves', 'estrelas_olhos',
  'marca_lunar', 'bioluminescencia', 'fractal_corpo',
] as const;

function pickFrom<T extends string>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function rarityFromGenome(g: Genome): Genotype['initialRarity'] {
  const avg =
    (g.creativity + g.resilience + g.emotionalDepth + g.intelligence) / 4;
  if (avg > 0.85) return 'lendario';
  if (avg > 0.72) return 'raro';
  if (avg > 0.55) return 'incomum';
  return 'comum';
}

function goalGeneBias(goal: UserGoal): Partial<Genome> {
  switch (goal) {
    case 'sono':
      return { emotionalDepth: 0.75, adaptability: 0.7 };
    case 'foco':
    case 'estudos':
      return { discipline: 0.78, intelligence: 0.75 };
    case 'emagrecimento':
    case 'saude_geral':
      return { resilience: 0.72, discipline: 0.65 };
    case 'ansiedade':
      return { empathy: 0.8, adaptability: 0.78 };
    case 'autoestima':
      return { socialEnergy: 0.72, creativity: 0.7 };
    case 'disciplina':
    default:
      return { discipline: 0.8, resilience: 0.68 };
  }
}

export function generateGenotype(input: PersonalizationInput): Genotype {
  const rng = mulberry32(input.seed);
  const preset = genomeForPersonality(input.personality);
  let genome = genomeFromPreset(input.seed, preset, 0.12);
  const bias = goalGeneBias(input.userGoal);
  for (const [k, v] of Object.entries(bias)) {
    const key = k as keyof Genome;
    genome = { ...genome, [key]: (genome[key] + v) / 2 };
  }
  if (input.stylePreset === 'mystic') {
    genome = { ...genome, creativity: Math.min(0.98, genome.creativity + 0.08) };
  } else if (input.stylePreset === 'bold') {
    genome = { ...genome, aggression: Math.min(0.98, genome.aggression + 0.06) };
  } else if (input.stylePreset === 'soft') {
    genome = { ...genome, empathy: Math.min(0.98, genome.empathy + 0.08) };
  }

  const latentCount = 2 + Math.floor(rng() * 2);
  const latentTraits: string[] = [];
  for (let i = 0; i < latentCount; i++) {
    const t = pickFrom(rng, LATENT_TRAITS);
    if (!latentTraits.includes(t)) latentTraits.push(t);
  }

  const predisposition = [pickFrom(rng, MUTATION_PREDISPOSITION)];

  return {
    seed: input.seed,
    archetype: pickFrom(rng, ARCHETYPES),
    genome,
    basePaletteId: `palette_${Math.floor(rng() * 20)}`,
    latentTraits,
    mutationPredisposition: predisposition,
    basePersonality: input.personality,
    initialRarity: rarityFromGenome(genome),
    bondType: input.bondType,
    userGoal: input.userGoal,
    communicationTone: input.communicationTone,
  };
}

/** Seed determinística a partir de userId + timestamp de criação. */
export function seedFromUserId(userId: string, salt = 0): number {
  let h = 0x811c9dc5 ^ salt;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function generateRandomGenotype(personality: Personality, seed: number): Genotype {
  return generateGenotype({
    seed,
    personality,
    mascotName: 'Mascote',
    bondType: 'companheiro',
    userGoal: 'saude_geral',
    communicationTone: 'carinhoso',
  });
}
