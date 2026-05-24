/**
 * Testes dos behaviors reativos (moments/gestos).
 */

import { describe, expect, it } from 'vitest';
import {
  selectBehavior,
  executeBehavior,
  reactivePet,
  reactivePostCheckin,
  reactiveMissionComplete,
  reactiveReturnAfterAbsence,
  reactiveHabitMissed,
  MOMENT_REACTIVE_BEHAVIORS,
  flagsFromMoment,
  type BehaviorContext,
} from '@/lib/behavior';
import { neutralGenome } from '@/lib/dna/genome';
import type { Mascot } from '@/types';

function makeCtx(partial: Partial<BehaviorContext> = {}): BehaviorContext {
  const mascot: Mascot = {
    id: 'm_1',
    user_id: 'u_1',
    name: 'Test',
    personality: 'calmo',
    phase: 'bebe',
    mood: 'ok',
    xp: 0,
    level: 1,
    energy: 80,
    health: 100,
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  return {
    mascot,
    genome: neutralGenome(),
    mood: 'ok',
    hoursSinceLastInteraction: 0,
    streakCurrent: 0,
    hour: 12,
    cooldownActive: new Set(),
    lastRanAt: new Map(),
    ...partial,
  };
}

describe('reactive behaviors — moment flags', () => {
  it('reactive.pet dispara com flag pet', () => {
    const sel = selectBehavior(MOMENT_REACTIVE_BEHAVIORS, makeCtx({ reactiveFlags: { pet: true } }));
    expect(sel.behavior?.id).toBe(reactivePet.id);
  });

  it('reactive.post_checkin dispara após check-in', () => {
    const sel = selectBehavior(
      MOMENT_REACTIVE_BEHAVIORS,
      makeCtx({ reactiveFlags: { postCheckin: true } }),
    );
    expect(sel.behavior?.id).toBe(reactivePostCheckin.id);
  });

  it('reactive.mission_complete dispara com flag', () => {
    const sel = selectBehavior(
      MOMENT_REACTIVE_BEHAVIORS,
      makeCtx({ reactiveFlags: { missionComplete: true } }),
    );
    expect(sel.behavior?.id).toBe(reactiveMissionComplete.id);
  });

  it('reactive.return_after_absence lê simulationEvents', () => {
    const sel = selectBehavior(
      MOMENT_REACTIVE_BEHAVIORS,
      makeCtx({
        hoursSinceLastInteraction: 30,
        simulationEvents: [{ kind: 'return_summary', at: new Date().toISOString() }],
      }),
    );
    expect(sel.behavior?.id).toBe(reactiveReturnAfterAbsence.id);
  });

  it('reactive.habit_missed dispara com evento de simulação', () => {
    const sel = selectBehavior(
      MOMENT_REACTIVE_BEHAVIORS,
      makeCtx({
        simulationEvents: [
          {
            kind: 'while_away_habit_missed',
            at: new Date().toISOString(),
            message: 'Notei noites mais curtas no seu ritmo.',
            payload: { habitKind: 'sleep', daysMissed: 2 },
          },
        ],
      }),
    );
    expect(sel.behavior?.id).toBe(reactiveHabitMissed.id);
  });

  it('flagsFromMoment mapeia checkin.completed', () => {
    expect(flagsFromMoment('checkin.completed')).toEqual({ postCheckin: true });
  });

  it('flagsFromMoment mapeia user.returned', () => {
    expect(flagsFromMoment('user.returned')).toEqual({ returnAfterAbsence: true });
  });

  it('flagsFromMoment mapeia gesture.pet e gesture.double', () => {
    expect(flagsFromMoment('gesture.pet')).toEqual({ pet: true });
    expect(flagsFromMoment('gesture.double')).toEqual({ missionComplete: true });
  });

  it('execute NUNCA usa tom de cobrança', () => {
    const eff = executeBehavior(
      reactiveReturnAfterAbsence,
      makeCtx({ hoursSinceLastInteraction: 72 }),
    );
    const msg = eff.message?.toLowerCase() ?? '';
    expect(msg).not.toMatch(/sumiu|abandonou|cadê|culpa/);
  });
});
