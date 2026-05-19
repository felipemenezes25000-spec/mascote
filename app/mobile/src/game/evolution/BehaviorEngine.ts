/**
 * Agrega check-ins e streak em BehaviorHistory — sem punição.
 */

import type { Checkin, HabitKind, MascotMood, Streak } from '@/types';
import type { BehaviorHistory } from './EvolutionTypes';
import { computeDominantHabits } from './EvolutionRules';

export interface BuildBehaviorInput {
  checkins: readonly Checkin[];
  streak: Streak | null;
  mood?: MascotMood;
}

export function buildBehaviorHistory(input: BuildBehaviorInput): BehaviorHistory {
  const habitCounts: Partial<Record<HabitKind, number>> = {};
  const weeklyHabitScore: Partial<Record<HabitKind, number>> = {};
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const c of input.checkins) {
    habitCounts[c.habit_kind] = (habitCounts[c.habit_kind] ?? 0) + 1;
    const t = new Date(c.occurred_at).getTime();
    if (t >= weekAgo) {
      weeklyHabitScore[c.habit_kind] = (weeklyHabitScore[c.habit_kind] ?? 0) + 1;
    }
  }

  const failuresSinceLastActive = input.streak?.grace_days_left !== undefined
    ? Math.max(0, 3 - (input.streak.grace_days_left ?? 3))
    : 0;

  return {
    habitCounts,
    currentStreak: input.streak?.current_streak ?? 0,
    longestStreak: input.streak?.longest_streak ?? 0,
    failuresSinceLastActive,
    recoveries: failuresSinceLastActive > 0 && (input.streak?.current_streak ?? 0) > 0 ? 1 : 0,
    lastActiveDate: input.streak?.last_active_date ?? null,
    dominantHabits: computeDominantHabits(habitCounts),
    weeklyHabitScore,
    moodSamples: input.mood ? [input.mood] : [],
  };
}

export function emptyBehaviorHistory(): BehaviorHistory {
  return {
    habitCounts: {},
    currentStreak: 0,
    longestStreak: 0,
    failuresSinceLastActive: 0,
    recoveries: 0,
    lastActiveDate: null,
    dominantHabits: [],
    weeklyHabitScore: {},
    moodSamples: [],
  };
}
