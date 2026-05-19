/**
 * Ponte entre mutações DNA (lib/dna) e motor de evolução.
 */

import {
  MUTATION_CATALOG,
  findNewlyUnlockedMutations,
  getMutationById,
  type Mutation,
  type MutationContext,
  type UnlockedMutation,
} from '@/lib/dna/mutations';
import type { Genome } from '@/lib/dna/genome';
import type { HabitKind } from '@/types';
import type { BehaviorHistory } from './EvolutionTypes';

export { MUTATION_CATALOG, findNewlyUnlockedMutations, getMutationById };
export type { Mutation, MutationContext, UnlockedMutation };

export function buildMutationContext(
  genome: Genome,
  history: BehaviorHistory,
  daysSinceCreated: number,
  alreadyUnlocked: ReadonlySet<string>,
): MutationContext {
  return {
    genome,
    habitCheckinCounts: history.habitCounts as Partial<Record<HabitKind, number>>,
    currentStreak: history.currentStreak,
    daysSinceCreated,
    alreadyUnlocked,
  };
}

export function resolveUnlockedMutations(
  userId: string,
  ids: readonly string[],
): UnlockedMutation[] {
  const now = new Date().toISOString();
  return ids
    .map(id => {
      const m = getMutationById(id);
      if (!m) return null;
      return {
        mutation_id: id,
        user_id: userId,
        unlocked_at: now,
      } satisfies UnlockedMutation;
    })
    .filter((x): x is UnlockedMutation => x !== null);
}
