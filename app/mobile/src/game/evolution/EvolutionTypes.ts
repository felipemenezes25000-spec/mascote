/**
 * Tipos do motor de evolução procedural — genótipo, fenótipo, histórico e microevoluções.
 */

import type { Genome } from '@/lib/dna/genome';
import type { Morphology } from '@/lib/dna/morphology';
import type { Palette } from '@/lib/dna/palette';
import type { HabitKind, MascotPhase, MascotMood, Personality } from '@/types';
import type { UnlockedMutation } from '@/lib/dna/mutations';

/** Fases macro visíveis (mapeiam para MascotPhase em milestones). */
export type MacroPhaseId =
  | 'ovo'
  | 'bebe'
  | 'crianca'
  | 'jovem'
  | 'adulto'
  | 'avancada'
  | 'lendaria';

export type BondType =
  | 'companheiro'
  | 'guardiao'
  | 'criatura_fofa'
  | 'espirito'
  | 'monstrinho'
  | 'avatar_interior';

export type UserGoal =
  | 'emagrecimento'
  | 'foco'
  | 'sono'
  | 'estudos'
  | 'ansiedade'
  | 'disciplina'
  | 'saude_geral'
  | 'autoestima';

export type CommunicationTone = 'carinhoso' | 'direto' | 'poetico' | 'engracado';

/** Aquilo que nasce com o mascote — imutável exceto mutações desbloqueadas. */
export interface Genotype {
  seed: number;
  archetype: string;
  genome: Genome;
  basePaletteId: string;
  latentTraits: string[];
  mutationPredisposition: string[];
  basePersonality: Personality;
  initialRarity: 'comum' | 'incomum' | 'raro' | 'lendario';
  bondType: BondType;
  userGoal: UserGoal;
  communicationTone: CommunicationTone;
}

/** Slots discretos que compõem o fenótipo visual (para contagem combinatória). */
export interface PhenotypeSlots {
  bodyType: number;
  bodyScale: number;
  posture: number;
  expression: number;
  eyeType: number;
  mouthType: number;
  auraType: number;
  textureType: number;
  colorPalette: number;
  bodyPattern: number;
  accessorySet: number;
  particleStyle: number;
  environmentId: number;
  animationSet: number;
  personalityFlavor: number;
  rarityTier: number;
}

/** Fenótipo completo — o que o renderer e a UI consomem. */
export interface Phenotype {
  slots: PhenotypeSlots;
  morphology: Morphology;
  palette: Palette;
  macroPhase: MacroPhaseId;
  microEvolutionLevel: number;
  activeMutations: UnlockedMutation[];
  mood: MascotMood;
  displayModifiers: PhenotypeDisplayModifiers;
}

export interface PhenotypeDisplayModifiers {
  glowMultiplier: number;
  auraParticleBoost: number;
  postureBias: number;
  eyeBrightness: number;
  bodyFirmness: number;
  calmAura: boolean;
  activeEnergy: boolean;
  zenParticles: boolean;
  missedYouTone: boolean;
}

/** Histórico comportamental agregado (não punitivo). */
export interface BehaviorHistory {
  habitCounts: Partial<Record<HabitKind, number>>;
  currentStreak: number;
  longestStreak: number;
  failuresSinceLastActive: number;
  recoveries: number;
  lastActiveDate: string | null;
  dominantHabits: HabitKind[];
  weeklyHabitScore: Partial<Record<HabitKind, number>>;
  moodSamples: MascotMood[];
}

export interface MicroEvolution {
  id: string;
  label: string;
  /** Impacto visual acumulativo em [0, 1]. */
  magnitude: number;
  habitAffinity?: HabitKind;
  unlockedAt: string;
}

export interface EvolutionState {
  genotype: Genotype;
  phenotype: Phenotype;
  behaviorHistory: BehaviorHistory;
  microEvolutions: MicroEvolution[];
  totalXp: number;
  mascotPhase: MascotPhase;
}

export interface EvolutionPreview {
  seed: number;
  genotype: Genotype;
  phenotype: Phenotype;
  rareTraitLabel: string;
  firstWords: string;
}

export interface PersonalizationInput {
  seed: number;
  personality: Personality;
  mascotName: string;
  bondType: BondType;
  userGoal: UserGoal;
  communicationTone: CommunicationTone;
  stylePreset?: 'soft' | 'vivid' | 'mystic' | 'bold';
  initialAccessoryIds?: string[];
  initialSceneId?: string;
}
