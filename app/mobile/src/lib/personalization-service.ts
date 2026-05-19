/**
 * Carrega/salva personalização e reaplica genótipo base no mascote.
 */

import { generateGenotype } from '@/game/evolution/GenotypeGenerator';
import { sanitizeGenome } from '@/lib/dna';
import { mascots as mascotsDb, settings as settingsDb } from '@/lib/db';
import { localPersonalizationRepo } from '@/repositories/local';
import type { StoredPersonalization } from '@/repositories/personalization';
import type { PersonalizationInput } from '@/game/evolution/EvolutionTypes';
import type { Mascot, Personality } from '@/types';
import {
  buildPersonalizationInput,
  personalityFromBond,
  seedFromOnboardingAnswers,
  type OnboardingAnswers,
} from '@/lib/onboarding-evolution';

export async function loadStoredPersonalization(userId: string): Promise<StoredPersonalization | null> {
  return localPersonalizationRepo.get(userId);
}

export async function savePersonalization(
  userId: string,
  input: PersonalizationInput,
  extras: { pronoun: StoredPersonalization['pronoun']; initialSceneId?: string },
): Promise<StoredPersonalization> {
  const stored: StoredPersonalization = {
    ...input,
    pronoun: extras.pronoun,
    initialSceneId: extras.initialSceneId,
    updatedAt: new Date().toISOString(),
  };
  await localPersonalizationRepo.save(userId, stored);
  await settingsDb.update(userId, {
    onboarding_bond: input.bondType,
    onboarding_tone: input.communicationTone,
    brand_palette: paletteFromStyle(input.stylePreset),
  } as Record<string, unknown>);
  return stored;
}

function paletteFromStyle(style?: PersonalizationInput['stylePreset']) {
  switch (style) {
    case 'vivid': return 'sunset';
    case 'mystic': return 'coral';
    case 'bold': return 'sun';
    case 'soft':
    default: return 'classic';
  }
}

/** Reaplica DNA base a partir da personalização (hábitos continuam evoluindo depois). */
export async function applyPersonalizationToMascot(
  mascot: Mascot,
  input: PersonalizationInput,
): Promise<Mascot> {
  const genotype = generateGenotype(input);
  const dna = sanitizeGenome(genotype.genome);
  return mascotsDb.upsert({
    user_id: mascot.user_id,
    name: input.mascotName || mascot.name,
    personality: input.personality,
    dna,
    dna_seed: input.seed,
  });
}

export function personalizationFromOnboarding(
  answers: OnboardingAnswers,
  mascotName: string,
  personality?: Personality,
): StoredPersonalization {
  const input = buildPersonalizationInput(answers, mascotName, personality);
  return {
    ...input,
    pronoun: answers.pronoun,
    updatedAt: new Date().toISOString(),
  };
}

export async function persistOnboardingPersonalization(
  userId: string,
  answers: OnboardingAnswers,
  mascotName: string,
  personality: Personality,
): Promise<StoredPersonalization> {
  const stored = personalizationFromOnboarding(answers, mascotName, personality);
  if (!stored.seed) {
    stored.seed = seedFromOnboardingAnswers(answers);
  }
  await localPersonalizationRepo.save(userId, stored);
  return stored;
}

export function storedToPartial(stored: StoredPersonalization | null): Partial<PersonalizationInput> | undefined {
  if (!stored) return undefined;
  const { pronoun: _p, updatedAt: _u, ...rest } = stored;
  return rest;
}

export { personalityFromBond };
