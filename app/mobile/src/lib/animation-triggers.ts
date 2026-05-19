/**
 * Triggers de animação reutilizáveis — missão, evolução, mutação, toque, saudade.
 */

export type MascotAnimationKind = 'bounce' | 'celebrate' | 'wander' | 'rest' | 'observe';

export type AnimationTriggerReason =
  | 'mission_complete'
  | 'evolution'
  | 'rare_mutation'
  | 'touch'
  | 'saudade'
  | 'retorno'
  | 'micro_evolution';

const HABIT_ANIMATIONS: Record<string, MascotAnimationKind> = {
  water: 'bounce',
  sleep: 'rest',
  exercise: 'celebrate',
  meditation: 'observe',
  breath: 'observe',
  reading: 'rest',
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
      return 'bounce';
    case 'saudade':
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
