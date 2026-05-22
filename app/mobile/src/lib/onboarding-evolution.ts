/**
 * Helpers do onboarding premium — seed, preview, mapeamento de respostas.
 */

import { generateEvolutionPreview } from '@/game/evolution/EvolutionEngine';
import type {
  BondType,
  CommunicationTone,
  EvolutionPreview,
  PersonalizationInput,
  UserGoal,
} from '@/game/evolution/EvolutionTypes';
import { mulberry32 } from '@/lib/dna/genome';
import type { Personality } from '@/types';

export type StylePreset = 'soft' | 'vivid' | 'mystic' | 'bold';

export interface OnboardingAnswers {
  goalId: string;
  moodId: string;
  stylePreset: StylePreset;
  bondType: BondType;
  communicationTone: CommunicationTone;
  pronoun: 'ele' | 'ela' | 'elu';
  primaryGoal: UserGoal;
}

const GOAL_TO_USER_GOAL: Record<string, UserGoal> = {
  sono: 'sono',
  agua: 'saude_geral',
  movimento: 'saude_geral',
  ansiedade: 'ansiedade',
  rotina: 'disciplina',
  energia: 'autoestima',
  companhia: 'saude_geral',
  foco: 'foco',
  estudos: 'estudos',
};

const MOOD_TO_MASCOT: Record<string, 'triste' | 'ok' | 'feliz' | 'empolgado' | 'exausto'> = {
  '1': 'triste',
  '2': 'ok',
  '3': 'ok',
  '4': 'feliz',
  '5': 'empolgado',
};

export function mapGoalToUserGoal(goalId: string): UserGoal {
  return GOAL_TO_USER_GOAL[goalId] ?? 'saude_geral';
}

export function mapMoodToMascot(moodId: string) {
  return MOOD_TO_MASCOT[moodId] ?? 'feliz';
}

/** Seed determinística a partir das respostas do onboarding. */
export function seedFromOnboardingAnswers(answers: OnboardingAnswers, salt = 0): number {
  const raw = [
    answers.goalId,
    answers.moodId,
    answers.stylePreset,
    answers.bondType,
    answers.communicationTone,
    answers.pronoun,
    answers.primaryGoal,
    String(salt),
  ].join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function personalityFromBond(bondType: BondType): Personality {
  switch (bondType) {
    case 'guardiao': return 'motivador';
    case 'criatura_fofa': return 'fofo';
    case 'espirito':
    case 'avatar_interior': return 'sabio';
    case 'monstrinho': return 'motivador';
    case 'companheiro':
    default: return 'calmo';
  }
}

export function buildPersonalizationInput(
  answers: OnboardingAnswers,
  mascotName: string,
  personality?: Personality,
): PersonalizationInput {
  const seed = seedFromOnboardingAnswers(answers);
  return {
    seed,
    personality: personality ?? personalityFromBond(answers.bondType),
    mascotName,
    bondType: answers.bondType,
    userGoal: answers.primaryGoal,
    communicationTone: answers.communicationTone,
    stylePreset: answers.stylePreset,
  };
}

export function generateOnboardingPreview(
  answers: OnboardingAnswers,
  mascotName = 'Mascote',
  personality?: Personality,
): EvolutionPreview {
  const input = buildPersonalizationInput(answers, mascotName, personality);
  return generateEvolutionPreview(input);
}

/** Escolhe traço raro legível para a tela de reveal. */
export function formatRareTrait(preview: EvolutionPreview): string {
  const label = preview.rareTraitLabel.replace(/_/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Missão ultra-rápida do primeiro 30s — sempre água, 1 copo. */
export const FIRST_MISSION = {
  title: 'Primeiro gole',
  description: 'Beba um copo de água agora. Leva 10 segundos.',
  habit_kind: 'water' as const,
  target_value: 1,
  xp_reward: 15,
};

/** Duração da animação de hatch (ms) — determinística por seed. */
export function hatchDurationMs(seed: number): number {
  const rng = mulberry32(seed ^ 0x0e66);
  return 1800 + Math.floor(rng() * 800);
}
