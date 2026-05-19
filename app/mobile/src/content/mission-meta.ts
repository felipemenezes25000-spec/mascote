/**
 * Metadados de missões — dificuldade, impacto visual, tier, tags, pré-requisitos.
 * Campos opcionais em MissionTemplate; inferidos quando ausentes.
 */

import type { HabitKind } from '@/types';
import type { MissionTemplate } from './missions';

export type MissionCategory =
  | 'water'
  | 'sleep'
  | 'movement'
  | 'food'
  | 'focus'
  | 'study'
  | 'meditation'
  | 'therapy'
  | 'breathing'
  | 'reading'
  | 'organization'
  | 'self_care'
  | 'social'
  | 'gratitude'
  | 'return_after_failure'
  | 'weekly_challenge'
  | 'surprise';

export type MissionDifficulty = 1 | 2 | 3 | 4 | 5;
export type MissionVisualImpact = 'low' | 'medium' | 'high';
export type MissionEmotionalImpact = 'gentle' | 'uplifting' | 'calm' | 'energizing';
export type MissionEvolutionType = 'micro' | 'macro' | 'mutation_hint';
export type MissionTier = 'free' | 'premium';

export interface MissionMetaFields {
  duration_minutes: number;
  difficulty: MissionDifficulty;
  visual_impact: MissionVisualImpact;
  emotional_impact: MissionEmotionalImpact;
  evolution_type: MissionEvolutionType;
  tier: MissionTier;
  repeatable: boolean;
  cooldown_hours: number;
  tags: string[];
  prerequisites: string[];
  category: MissionCategory;
}

const HABIT_TO_CATEGORY: Record<HabitKind, MissionCategory> = {
  water: 'water',
  sleep: 'sleep',
  exercise: 'movement',
  meditation: 'meditation',
  reading: 'reading',
  journaling: 'gratitude',
  breath: 'breathing',
  outdoor: 'self_care',
  sun: 'self_care',
};

function difficultyFromXp(xp: number): MissionDifficulty {
  if (xp >= 40) return 5;
  if (xp >= 30) return 4;
  if (xp >= 20) return 3;
  if (xp >= 15) return 2;
  return 1;
}

function durationFromTarget(habit: HabitKind, target: number | null): number {
  if (target == null) {
    const defaults: Partial<Record<HabitKind, number>> = {
      meditation: 10,
      exercise: 15,
      sleep: 5,
      reading: 10,
    };
    return defaults[habit] ?? 5;
  }
  if (habit === 'exercise' || habit === 'outdoor') return Math.min(60, target);
  if (habit === 'reading') return Math.min(30, target * 3);
  if (habit === 'meditation') return Math.min(30, target);
  return Math.min(20, target * 2);
}

/** Infere metadados a partir do hábito e XP — sem listas fake. */
export function inferMissionMeta(
  mission: Pick<MissionTemplate, 'habit_kind' | 'xp_reward' | 'target_value' | 'id'>,
): MissionMetaFields {
  const category = HABIT_TO_CATEGORY[mission.habit_kind];
  const difficulty = difficultyFromXp(mission.xp_reward);
  const isWeekly = mission.id.includes('weekly') || mission.id.includes('semana');
  const isReturn = mission.id.includes('return') || mission.id.includes('volta');
  const isSurprise = mission.id.includes('surprise') || mission.id.includes('mystery');

  let visual_impact: MissionVisualImpact = 'medium';
  if (mission.habit_kind === 'water' || mission.habit_kind === 'sun') visual_impact = 'high';
  if (mission.habit_kind === 'journaling' || mission.habit_kind === 'breath') visual_impact = 'low';

  let emotional_impact: MissionEmotionalImpact = 'uplifting';
  if (mission.habit_kind === 'meditation' || mission.habit_kind === 'sleep') emotional_impact = 'calm';
  if (mission.habit_kind === 'exercise') emotional_impact = 'energizing';

  return {
    duration_minutes: durationFromTarget(mission.habit_kind, mission.target_value),
    difficulty,
    visual_impact,
    emotional_impact,
    evolution_type: difficulty >= 4 ? 'macro' : 'micro',
    tier: difficulty >= 5 && mission.xp_reward >= 40 ? 'premium' : 'free',
    repeatable: !isWeekly,
    cooldown_hours: isWeekly ? 168 : isReturn ? 72 : 24,
    tags: [category, mission.habit_kind, ...(isReturn ? ['return_after_failure'] : [])],
    prerequisites: [],
    category: isReturn ? 'return_after_failure' : isWeekly ? 'weekly_challenge' : isSurprise ? 'surprise' : category,
  };
}

/** Preenche metadados ausentes num template. */
export function enrichMissionTemplate(mission: MissionTemplate): MissionTemplate & MissionMetaFields {
  const inferred = inferMissionMeta(mission);
  return {
    ...mission,
    duration_minutes: mission.duration_minutes ?? inferred.duration_minutes,
    difficulty: mission.difficulty ?? inferred.difficulty,
    visual_impact: mission.visual_impact ?? inferred.visual_impact,
    emotional_impact: mission.emotional_impact ?? inferred.emotional_impact,
    evolution_type: mission.evolution_type ?? inferred.evolution_type,
    tier: mission.tier ?? inferred.tier,
    repeatable: mission.repeatable ?? inferred.repeatable,
    cooldown_hours: mission.cooldown_hours ?? inferred.cooldown_hours,
    tags: mission.tags ?? inferred.tags,
    prerequisites: mission.prerequisites ?? inferred.prerequisites,
    category: mission.category ?? inferred.category,
  };
}
