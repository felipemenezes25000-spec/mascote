/**
 * Funções puras de serialização — sem dependência do bridge nativo.
 */

import type {
  UnityHabitKind,
  UnityMascotEvent,
  UnityToRNMessage,
} from '@/core/mascot-render-contract';

export function parseUnityToRN(raw: string): UnityToRNMessage | null {
  try {
    const parsed = JSON.parse(raw) as UnityToRNMessage;
    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Mapeamento hábito → animação Unity (espelha AnimationStateMap.cs). */
export const HABIT_REACTION_ANIM: Record<UnityHabitKind, string> = {
  water: 'observe',
  sleep: 'sleep',
  exercise: 'stretch',
  meditation: 'rest',
  reading: 'observe',
  journaling: 'smile',
  breath: 'rest',
  outdoor: 'stretch',
  sun: 'smile',
};

export function habitToUnityEvent(habit: UnityHabitKind, intensity?: number): UnityMascotEvent {
  return { kind: 'habit', habit, intensity };
}

export function buildHabitEventFromCheckin(
  habit: UnityHabitKind,
  xpGained: number,
): UnityMascotEvent {
  return { kind: 'checkin.completed', habit, xpGained };
}
