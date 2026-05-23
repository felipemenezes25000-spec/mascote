/**
 * Tabelas de mapeamento PT (app) → EN (Unity).
 */

import type {
  UnityHabitKind,
  UnityMascotMood,
  UnityMascotPhase,
  UnityPersonality,
} from './types';
import type { HabitKind, MascotMood, MascotPhase, Personality } from '@/types';

export const PHASE_TO_UNITY: Record<MascotPhase, UnityMascotPhase> = {
  ovo: 'egg',
  bebe: 'baby',
  crianca: 'child',
  adolescente: 'teen',
  adulto: 'adult',
  evoluido: 'evolved',
};

export const UNITY_TO_PHASE: Record<UnityMascotPhase, MascotPhase> = {
  egg: 'ovo',
  baby: 'bebe',
  child: 'crianca',
  teen: 'adolescente',
  adult: 'adulto',
  evolved: 'evoluido',
};

export const MOOD_TO_UNITY: Record<MascotMood, UnityMascotMood> = {
  triste: 'sad',
  ok: 'neutral',
  feliz: 'happy',
  empolgado: 'excited',
  exausto: 'exhausted',
};

export const PERSONALITY_TO_UNITY: Record<Personality, UnityPersonality> = {
  calmo: 'calm',
  motivador: 'motivator',
  fofo: 'cute',
  sabio: 'wise',
};

export const PERSONALITY_TO_BASE_MODEL: Record<Personality, string> = {
  calmo: 'bipo',
  motivador: 'zip',
  fofo: 'lulu',
  sabio: 'aro',
};

export const HABIT_TO_UNITY: Record<HabitKind, UnityHabitKind> = {
  water: 'water',
  sleep: 'sleep',
  exercise: 'exercise',
  meditation: 'meditation',
  reading: 'reading',
  journaling: 'journaling',
  breath: 'breath',
  outdoor: 'outdoor',
  sun: 'sun',
};

/**
 * Tabela unificada — 18 GLBs reais em assets/mascot-3d/accessories/.
 * Chave = assetKey Unity; valor = metadados de mapeamento.
 */
export const UNITY_GLB_ACCESSORIES = {
  cap_classic: { glb: 'cap_classic', slot: 'hat', bone: 'head' },
  beanie: { glb: 'beanie', slot: 'hat', bone: 'head' },
  bow_tie: { glb: 'bow_tie', slot: 'hat', bone: 'head' },
  cape_velvet: { glb: 'cape_velvet', slot: 'back', bone: 'body' },
  crown_flowers: { glb: 'crown_flowers', slot: 'hat', bone: 'head' },
  crown_royal: { glb: 'crown_royal', slot: 'hat', bone: 'head' },
  flame_mane: { glb: 'flame_mane', slot: 'hat', bone: 'head' },
  flower_daisy: { glb: 'flower_daisy', slot: 'hat', bone: 'head' },
  glasses_round: { glb: 'glasses_round', slot: 'glasses', bone: 'head' },
  heart_glow: { glb: 'heart_glow', slot: 'body', bone: 'chest' },
  monocle_gold: { glb: 'monocle_gold', slot: 'glasses', bone: 'head' },
  scarf_cozy: { glb: 'scarf_cozy', slot: 'neck', bone: 'neck' },
  sunglasses: { glb: 'sunglasses', slot: 'glasses', bone: 'head' },
  sword_floating: { glb: 'sword_floating', slot: 'back', bone: 'hand_R' },
  wings_angel: { glb: 'wings_angel', slot: 'back', bone: 'body' },
  wings_butterfly: { glb: 'wings_butterfly', slot: 'back', bone: 'body' },
  wings_dragon: { glb: 'wings_dragon', slot: 'back', bone: 'body' },
  aura_cosmic: { glb: 'aura_cosmic', slot: 'aura', bone: 'body' },
} as const;

export type UnityGlbAccessoryKey = keyof typeof UNITY_GLB_ACCESSORIES;

/**
 * IDs do catálogo RN → asset keys Unity (GLB real).
 */
export const ACCESSORY_ID_TO_UNITY: Record<string, UnityGlbAccessoryKey> = {
  cap: 'cap_classic',
  bow: 'bow_tie',
  glasses: 'glasses_round',
  scarf: 'scarf_cozy',
  crown: 'crown_royal',
  flower: 'flower_daisy',
  headphones: 'beanie',
  mask: 'sunglasses',
  star: 'heart_glow',
  monocle: 'monocle_gold',
  cape: 'cape_velvet',
  leaf: 'flame_mane',
  cookie: 'heart_glow',
  horn: 'sword_floating',
};

/** Aliases legados Sprint 1 → GLB real. */
export const ACCESSORY_LEGACY_ALIASES: Record<string, UnityGlbAccessoryKey> = {
  bow_classic: 'bow_tie',
  scarf_green: 'scarf_cozy',
  crown_gold: 'crown_royal',
  flower_orange: 'flower_daisy',
  headphones_music: 'beanie',
  mask_theater: 'sunglasses',
  star_forehead: 'heart_glow',
  monocle_scholar: 'monocle_gold',
  cape_hero: 'cape_velvet',
  leaf_autumn: 'flame_mane',
  cookie_fortune: 'heart_glow',
  horn_legendary: 'sword_floating',
};

export function mapPhase(phase: MascotPhase): UnityMascotPhase {
  return PHASE_TO_UNITY[phase];
}

export function mapMood(mood: MascotMood): UnityMascotMood {
  return MOOD_TO_UNITY[mood];
}

export function mapPersonality(personality: Personality): UnityPersonality {
  return PERSONALITY_TO_UNITY[personality];
}

export function mapHabit(habit: HabitKind): UnityHabitKind {
  return HABIT_TO_UNITY[habit];
}

export function mapAccessoryId(id: string): string {
  if (id in ACCESSORY_ID_TO_UNITY) return ACCESSORY_ID_TO_UNITY[id];
  if (id in ACCESSORY_LEGACY_ALIASES) return ACCESSORY_LEGACY_ALIASES[id];
  if (id in UNITY_GLB_ACCESSORIES) return id;
  return id;
}
