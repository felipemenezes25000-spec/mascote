/**
 * Triggers de animação reutilizáveis — missão, evolução, mutação, hábitos, saudade.
 */

export type MascotAnimationKind =
  | 'bounce'
  | 'celebrate'
  | 'wander'
  | 'rest'
  | 'observe'
  | 'stretch'
  | 'pulse';

export type AnimationTriggerReason =
  | 'mission_complete'
  | 'evolution'
  | 'rare_mutation'
  | 'touch'
  | 'saudade'
  | 'miss_user'
  | 'retorno'
  | 'micro_evolution'
  | 'habit_water'
  | 'habit_sleep'
  | 'habit_train'
  | 'habit_meditate'
  | 'habit_sun'
  | 'habit_read';

const HABIT_ANIMATIONS: Record<string, MascotAnimationKind> = {
  water: 'bounce',
  sleep: 'rest',
  exercise: 'stretch',
  train: 'stretch',
  meditation: 'observe',
  meditate: 'observe',
  breath: 'pulse',
  reading: 'rest',
  read: 'rest',
  journaling: 'rest',
  outdoor: 'wander',
  sun: 'celebrate',
};

export function animationForHabit(habitKind: string): MascotAnimationKind {
  return HABIT_ANIMATIONS[habitKind] ?? 'bounce';
}

export function animationForTrigger(reason: AnimationTriggerReason, habitKind?: string): MascotAnimationKind {
  switch (reason) {
    case 'mission_complete':
      return habitKind ? animationForHabit(habitKind) : 'celebrate';
    case 'evolution':
    case 'rare_mutation':
    case 'micro_evolution':
      return 'celebrate';
    case 'touch':
    case 'habit_water':
      return 'bounce';
    case 'habit_sleep':
      return 'rest';
    case 'habit_train':
      return 'stretch';
    case 'habit_meditate':
      return 'observe';
    case 'habit_sun':
      return 'celebrate';
    case 'habit_read':
      return 'rest';
    case 'saudade':
    case 'miss_user':
      return 'observe';
    case 'retorno':
      return 'wander';
    default:
      return 'bounce';
  }
}

export function createAnimationAction(
  reason: AnimationTriggerReason,
  habitKind?: string,
): { kind: MascotAnimationKind; key: number } {
  return {
    kind: animationForTrigger(reason, habitKind),
    key: Date.now(),
  };
}

/** Mapeia HabitKind do app para trigger explícito (home / check-in). */
export function animationTriggerForHabitKind(habit: string): AnimationTriggerReason {
  const map: Record<string, AnimationTriggerReason> = {
    water: 'habit_water',
    sleep: 'habit_sleep',
    exercise: 'habit_train',
    meditation: 'habit_meditate',
    reading: 'habit_read',
    sun: 'habit_sun',
  };
  return map[habit] ?? 'mission_complete';
}
