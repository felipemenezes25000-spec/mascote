/**
 * Behaviors reativos disparados por moments (pet, check-in, missão, retorno).
 * Complementam o tick periódico — score alto quando o moment bate.
 */

import type { Behavior, BehaviorContext, BehaviorEffect } from './types';
import type { SimulationEvent } from '@/sim/types';

/** Flag setada pelo moment bridge antes do próximo tick/select. */
export interface ReactiveFlags {
  pet?: boolean;
  postCheckin?: boolean;
  missionComplete?: boolean;
  returnAfterAbsence?: boolean;
}

export const reactivePet: Behavior = {
  id: 'reactive.pet',
  kind: 'reactive',
  cooldownSeconds: 8,
  score: (ctx: BehaviorContext) => (ctx.reactiveFlags?.pet ? 0.95 : 0),
  execute: (): BehaviorEffect => ({
    animation: 'wander',
    message: 'Hmm. Gostei disso.',
  }),
};

export const reactivePostCheckin: Behavior = {
  id: 'reactive.post_checkin',
  kind: 'reactive',
  cooldownSeconds: 20,
  score: (ctx: BehaviorContext) => (ctx.reactiveFlags?.postCheckin ? 0.9 : 0),
  execute: (): BehaviorEffect => ({
    animation: 'celebrate',
    message: 'Isso conta. De verdade.',
  }),
};

export const reactiveMissionComplete: Behavior = {
  id: 'reactive.mission_complete',
  kind: 'reactive',
  cooldownSeconds: 30,
  score: (ctx: BehaviorContext) => (ctx.reactiveFlags?.missionComplete ? 0.92 : 0),
  execute: (): BehaviorEffect => ({
    animation: 'celebrate',
    message: 'Missão feita. Orgulho leve.',
  }),
};

export const reactiveReturnAfterAbsence: Behavior = {
  id: 'reactive.return_after_absence',
  kind: 'reactive',
  cooldownSeconds: 6 * 60 * 60,
  score: (ctx: BehaviorContext) => {
    if (ctx.reactiveFlags?.returnAfterAbsence) return 0.88;
    const hasReturn = ctx.simulationEvents?.some(
      e => e.kind === 'return_summary' || e.kind === 'celebration_return',
    );
    if (hasReturn && ctx.hoursSinceLastInteraction >= 24) return 0.85;
    return 0;
  },
  execute: (ctx: BehaviorContext): BehaviorEffect => {
    const hours = ctx.lifeState?.absence_hours ?? ctx.hoursSinceLastInteraction;
    const days = Math.floor(hours / 24);
    const msg =
      days >= 3
        ? 'Bom te ver de novo. Fiquei no meu ritmo.'
        : 'Enquanto você estava fora, respirei fundo.';
    return { animation: 'wander', message: msg };
  },
};

export const reactiveHabitMissed: Behavior = {
  id: 'reactive.habit_missed',
  kind: 'reactive',
  cooldownSeconds: 6 * 60 * 60,
  score: (ctx: BehaviorContext) => {
    if (ctx.simulationEvents?.some(e => e.kind === 'while_away_habit_missed')) return 0.82;
    return 0;
  },
  execute: (ctx: BehaviorContext): BehaviorEffect => {
    const ev = ctx.simulationEvents?.find(e => e.kind === 'while_away_habit_missed');
    return {
      animation: 'rest',
      message: ev?.message ?? 'Seu ritmo mudou um pouco. Sem pressa.',
    };
  },
};

export const reactiveStreakRisk: Behavior = {
  id: 'reactive.streak_risk',
  kind: 'reactive',
  cooldownSeconds: 12 * 60 * 60,
  score: (ctx: BehaviorContext) => {
    if (ctx.simulationEvents?.some(e => e.kind === 'while_away_streak_risk')) return 0.78;
    return 0;
  },
  execute: (ctx: BehaviorContext): BehaviorEffect => {
    const ev = ctx.simulationEvents?.find(e => e.kind === 'while_away_streak_risk');
    return {
      animation: 'wander',
      message: ev?.message ?? 'Seu ritmo tá firme. Um check-in leve hoje já ajuda.',
    };
  },
};

export const MOMENT_REACTIVE_BEHAVIORS: readonly Behavior[] = [
  reactivePet,
  reactivePostCheckin,
  reactiveMissionComplete,
  reactiveReturnAfterAbsence,
  reactiveHabitMissed,
  reactiveStreakRisk,
];

/** Mapeia moment → flags reativas (consumidas no próximo behavior tick). */
export function flagsFromMoment(name: string): ReactiveFlags | null {
  switch (name) {
    case 'habit.water':
    case 'habit.sleep':
    case 'habit.exercise':
    case 'habit.meditation':
    case 'habit.reading':
    case 'habit.breath':
    case 'habit.outdoor':
    case 'habit.sun':
    case 'habit.journaling':
    case 'checkin.completed':
      return { postCheckin: true };
    case 'mission.completed':
      return { missionComplete: true };
    case 'user.returned':
      return { returnAfterAbsence: true };
    case 'gesture.pet':
      return { pet: true };
    case 'gesture.double':
      return { missionComplete: true };
    default:
      return null;
  }
}

export function mergeReactiveFlags(
  base: ReactiveFlags | undefined,
  extra: ReactiveFlags | null,
): ReactiveFlags | undefined {
  if (!extra) return base;
  return { ...base, ...extra };
}

export function eventsIncludeReturn(events: readonly SimulationEvent[] | undefined): boolean {
  return !!events?.some(e => e.kind === 'return_summary' || e.kind === 'celebration_return');
}
