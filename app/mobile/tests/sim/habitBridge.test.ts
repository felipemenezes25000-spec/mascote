/**
 * Testes do habitBridge — padrões de check-in e drift offline.
 */

import { describe, expect, it } from 'vitest';
import {
  assessStreakRisk,
  buildHabitSimContext,
  computeHabitDriftMultipliers,
  detectMissedHabits,
  detectRegularHabits,
  habitMissedMessage,
} from '@/sim/habitBridge';
import { addDays } from '@/lib/db';
import type { Checkin, Streak } from '@/types';

const AS_OF = '2026-05-24';

function mkCheckin(habit: Checkin['habit_kind'], dayOffset: number): Checkin {
  const occurred_on = addDays(AS_OF, dayOffset);
  return {
    id: `c_${habit}_${dayOffset}`,
    user_id: 'u1',
    habit_kind: habit,
    value: null,
    unit: null,
    occurred_on,
    occurred_at: `${occurred_on}T10:00:00.000Z`,
    xp_awarded: 10,
    idempotency_key: `${habit}_${occurred_on}`,
    created_at: `${occurred_on}T10:00:00.000Z`,
  };
}

function sleepPattern(): Checkin[] {
  return [-6, -5, -4, -3, -2, -1].map(d => mkCheckin('sleep', d));
}

describe('detectRegularHabits', () => {
  it('identifica hábito com 3+ check-ins em 7 dias', () => {
    const habits = detectRegularHabits(sleepPattern(), AS_OF);
    expect(habits).toContain('sleep');
  });

  it('ignora hábito esporádico', () => {
    const habits = detectRegularHabits([mkCheckin('exercise', -1)], AS_OF);
    expect(habits).not.toContain('exercise');
  });
});

describe('detectMissedHabits', () => {
  it('detecta sleep perdido após 30h ausente', () => {
    const missed = detectMissedHabits(sleepPattern(), 30, AS_OF);
    expect(missed.some(m => m.habit === 'sleep')).toBe(true);
  });

  it('não detecta miss com ausência curta', () => {
    const missed = detectMissedHabits(sleepPattern(), 2, AS_OF);
    expect(missed).toHaveLength(0);
  });
});

describe('computeHabitDriftMultipliers', () => {
  it('sleep missed aumenta decay de energy mais que mood genérico', () => {
    const sleep = computeHabitDriftMultipliers([{ habit: 'sleep', daysMissed: 2 }]);
    const exercise = computeHabitDriftMultipliers([{ habit: 'exercise', daysMissed: 2 }]);
    expect(sleep.energyDecayMultiplier).toBeGreaterThan(exercise.energyDecayMultiplier);
    expect(exercise.moodSensitivityMultiplier).toBeGreaterThan(sleep.moodSensitivityMultiplier);
  });
});

describe('assessStreakRisk', () => {
  it('streak longo + gap de 2 dias = risco', () => {
    const streak: Streak = {
      user_id: 'u1',
      current_streak: 10,
      longest_streak: 10,
      last_active_date: addDays(AS_OF, -2),
      grace_days_left: 0,
      updated_at: AS_OF,
    };
    expect(assessStreakRisk(streak, AS_OF)).toBe(true);
  });

  it('streak curto sem gap = sem risco', () => {
    const streak: Streak = {
      user_id: 'u1',
      current_streak: 2,
      longest_streak: 2,
      last_active_date: addDays(AS_OF, -1),
      grace_days_left: 2,
      updated_at: AS_OF,
    };
    expect(assessStreakRisk(streak, AS_OF)).toBe(false);
  });
});

describe('buildHabitSimContext', () => {
  it('monta contexto completo', () => {
    const ctx = buildHabitSimContext(sleepPattern(), null, 30, AS_OF);
    expect(ctx.missedHabits.length).toBeGreaterThan(0);
    expect(ctx.energyDecayMultiplier).toBeGreaterThan(1);
  });
});

describe('habitMissedMessage', () => {
  it('mensagens sem tom de cobrança', () => {
    const msg = habitMissedMessage('sleep');
    expect(msg.toLowerCase()).not.toMatch(/deve|tem que|cadê|culpa/);
  });
});
