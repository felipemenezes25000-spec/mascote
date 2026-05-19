/**
 * Barrel export do Behavior Engine.
 *
 * Consumer típico:
 *   import { selectBehavior, DEFAULT_BEHAVIORS, computeCooldownSet } from '@/lib/behavior';
 */

export type {
  Behavior,
  BehaviorContext,
  BehaviorEffect,
  BehaviorScore,
  BehaviorSelection,
} from './types';

export {
  selectBehavior,
  executeBehavior,
  computeCooldownSet,
} from './engine';

export {
  idleBreath,
  reactToReturn,
  streakMilestone,
  quietObservation,
  expressSocialBurst,
  quietContemplation,
  morningGreeting,
  eveningCalm,
  gentleReturn,
  moodRecoveryCheer,
  DEFAULT_BEHAVIORS,
} from './behaviors';

export { useBehaviorTick, type UseBehaviorTickOptions } from './useBehaviorTick';
