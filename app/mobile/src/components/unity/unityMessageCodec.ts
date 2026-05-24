/**
 * Funções puras de serialização — sem dependência do bridge nativo.
 */

import type {
  UnityHabitKind,
  UnityMascotEvent,
  UnityToRNMessage,
} from '@/core/mascot-render-contract';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isKnownUnityToRNMessage(value: unknown): value is UnityToRNMessage {
  if (!isRecord(value) || !isNonEmptyString(value.type)) return false;
  switch (value.type) {
    case 'ready':
      return isNonEmptyString(value.version);
    case 'error':
      return (
        isNonEmptyString(value.code) &&
        isNonEmptyString(value.message) &&
        isBoolean(value.recoverable)
      );
    case 'animation.complete':
      return isNonEmptyString(value.name);
    case 'gesture.received':
      return isNonEmptyString(value.gesture);
    default:
      return false;
  }
}

export function parseUnityToRN(raw: string): UnityToRNMessage | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isKnownUnityToRNMessage(parsed) ? parsed : null;
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
