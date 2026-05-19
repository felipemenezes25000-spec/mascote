/**
 * Flavor de personalidade derivado do genótipo + tom de comunicação.
 */

import type { Personality } from '@/types';
import type { Genotype } from './EvolutionTypes';
import { mulberry32 } from '@/lib/dna/genome';

const FLAVOR_BY_PERSONALITY: Record<Personality, string[]> = {
  calmo: ['sereno', 'lunar', 'brisa', 'névoa'],
  motivador: ['ígneo', 'radiante', 'impulso', 'faísca'],
  fofo: ['açucarado', 'fofinho', 'carinhoso', 'mimo'],
  sabio: ['ancoral', 'profundo', 'lúcido', 'eco'],
};

export function personalityFlavorIndex(genotype: Genotype): number {
  const flavors = FLAVOR_BY_PERSONALITY[genotype.basePersonality];
  const rng = mulberry32(genotype.seed ^ 0xabc);
  return Math.floor(rng() * flavors.length);
}

export function personalityFlavorLabel(genotype: Genotype): string {
  const flavors = FLAVOR_BY_PERSONALITY[genotype.basePersonality];
  return flavors[personalityFlavorIndex(genotype)] ?? 'único';
}

export function firstWordsForPreview(genotype: Genotype, mascotName: string): string {
  const tone = genotype.communicationTone;
  const flavor = personalityFlavorLabel(genotype);
  switch (tone) {
    case 'poetico':
      return `${mascotName} desperta com um brilho ${flavor}. Sinto que viemos de longe.`;
    case 'direto':
      return `Sou ${mascotName}. Tô aqui. Vamos cuidar de você.`;
    case 'engracado':
      return `${mascotName} acordou! (Sim, eu falo. Surpresa?)`;
    case 'carinhoso':
    default:
      return `Oi... sou ${mascotName}. Fico feliz em te encontrar.`;
  }
}

export function rareTraitLabel(genotype: Genotype): string {
  if (genotype.initialRarity === 'lendario') return 'Essência lendária';
  if (genotype.latentTraits.length > 0) return genotype.latentTraits[0]!;
  if (genotype.mutationPredisposition.length > 0) return genotype.mutationPredisposition[0]!;
  return genotype.archetype;
}
