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
  DEFAULT_BEHAVIORS,
} from './behaviors';
