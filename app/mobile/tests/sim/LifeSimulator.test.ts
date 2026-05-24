/**
 * Testes do LifeSimulator — tick offline, eventos e genome bridge.
 */

import { describe, expect, it } from 'vitest';
import { neutralGenome } from '@/lib/dna/genome';
import { genomeToSimParams } from '@/sim/genomeBridge';
import { nudgeGenomeFromAbsence } from '@/sim/evolutionBridge';
import {
  runLifeTick,
  pickStatusLineFromEvents,
  hasReturnCelebration,
  hasHabitMissedEvent,
  hasStreakRiskEvent,
} from '@/sim/LifeSimulator';
import { buildHabitSimContext } from '@/sim/habitBridge';
import { addDays } from '@/lib/db';
import type { Checkin } from '@/types';

const NOW = new Date('2026-05-24T12:00:00Z').getTime();

function baseInput(overrides: Partial<import('@/sim/types').SimTickInput> = {}) {
  return {
    userId: 'u1',
    energy: 80,
    mood: 'ok' as const,
    lastSimulatedAt: new Date(NOW - 30 * 3_600_000).toISOString(),
    lastSeenAt: new Date(NOW - 30 * 3_600_000).toISOString(),
    hoursSinceInteraction: 30,
    ...overrides,
  };
}

describe('genomeToSimParams', () => {
  it('resilience alta reduz decay', () => {
    const low = genomeToSimParams({ ...neutralGenome(), resilience: 0.1 });
    const high = genomeToSimParams({ ...neutralGenome(), resilience: 0.9 });
    expect(high.energyDecayPerHour).toBeLessThan(low.energyDecayPerHour);
  });
});

describe('runLifeTick', () => {
  it('skip micro-tick (< 3 min)', () => {
    const result = runLifeTick(
      baseInput({
        lastSimulatedAt: new Date(NOW - 60_000).toISOString(),
        lastSeenAt: new Date(NOW - 60_000).toISOString(),
        hoursSinceInteraction: 0.02,
      }),
      neutralGenome(),
      NOW,
    );
    expect(result.events).toHaveLength(0);
    expect(result.energy).toBe(80);
  });

  it('decai energy após horas ausente', () => {
    const result = runLifeTick(baseInput(), neutralGenome(), NOW);
    expect(result.energy).toBeLessThan(80);
    expect(result.events.some(e => e.kind === 'energy_change')).toBe(true);
  });

  it('emite while_away_moment após threshold', () => {
    const result = runLifeTick(
      baseInput({ hoursSinceInteraction: 8 }),
      neutralGenome(),
      NOW,
    );
    expect(result.events.some(e => e.kind === 'while_away_moment')).toBe(true);
  });

  it('gera living moment após ausência média', () => {
    const result = runLifeTick(
      baseInput({ hoursSinceInteraction: 12 }),
      neutralGenome(),
      NOW,
    );
    expect(result.events.some(e => e.kind === 'while_away_living_moment')).toBe(true);
  });

  it('emite return_summary após 24h+', () => {
    const result = runLifeTick(
      baseInput({
        hoursSinceInteraction: 48,
        lastSeenAt: new Date(NOW - 48 * 3_600_000).toISOString(),
      }),
      neutralGenome(),
      NOW,
    );
    expect(result.events.some(e => e.kind === 'return_summary')).toBe(true);
    expect(result.summaryLine).toBeTruthy();
    expect(hasReturnCelebration(result.events)).toBe(true);
  });

  it('energy nunca cai abaixo do floor', () => {
    const result = runLifeTick(
      baseInput({
        energy: 15,
        lastSimulatedAt: new Date(NOW - 200 * 3_600_000).toISOString(),
      }),
      neutralGenome(),
      NOW,
    );
    expect(result.energy).toBeGreaterThanOrEqual(12);
  });

  it('pickStatusLineFromEvents prioriza return_summary', () => {
    const events = runLifeTick(
      baseInput({ hoursSinceInteraction: 72 }),
      neutralGenome(),
      NOW,
    ).events;
    const line = pickStatusLineFromEvents(events);
    expect(line).toContain('Fiquei');
  });

  it('sleep missed acelera decay de energy vs tick genérico', () => {
    const base = runLifeTick(baseInput(), neutralGenome(), NOW);
    const sleepCheckins: Checkin[] = [-6, -5, -4, -3, -2, -1].map(d => ({
      id: `c_${d}`,
      user_id: 'u1',
      habit_kind: 'sleep' as const,
      value: 7,
      unit: 'h',
      occurred_on: addDays('2026-05-24', d),
      occurred_at: `${addDays('2026-05-24', d)}T08:00:00.000Z`,
      xp_awarded: 10,
      idempotency_key: `sleep_${d}`,
      created_at: `${addDays('2026-05-24', d)}T08:00:00.000Z`,
    }));
    const habitCtx = buildHabitSimContext(sleepCheckins, null, 30, '2026-05-24');
    const withHabit = runLifeTick(baseInput({ habitContext: habitCtx }), neutralGenome(), NOW);
    expect(withHabit.energy).toBeLessThan(base.energy);
    expect(withHabit.events.some(e => e.kind === 'while_away_habit_missed')).toBe(true);
  });

  it('emite while_away_streak_risk quando streak em risco', () => {
    const habitCtx = buildHabitSimContext([], {
      user_id: 'u1',
      current_streak: 14,
      longest_streak: 14,
      last_active_date: addDays('2026-05-24', -2),
      grace_days_left: 0,
      updated_at: '2026-05-24',
    }, 30, '2026-05-24');
    const result = runLifeTick(baseInput({ habitContext: habitCtx }), neutralGenome(), NOW);
    expect(result.events.some(e => e.kind === 'while_away_streak_risk')).toBe(true);
    expect(hasStreakRiskEvent(result.events)).toBe(true);
  });

  it('pickStatusLineFromEvents prioriza habit_missed', () => {
    const events = runLifeTick(
      baseInput({
        habitContext: buildHabitSimContext(
          [-6, -5, -4, -3, -2, -1].map(d => ({
            id: `c_${d}`,
            user_id: 'u1',
            habit_kind: 'sleep' as const,
            value: null,
            unit: null,
            occurred_on: addDays('2026-05-24', d),
            occurred_at: `${addDays('2026-05-24', d)}T08:00:00.000Z`,
            xp_awarded: 10,
            idempotency_key: `s_${d}`,
            created_at: `${addDays('2026-05-24', d)}T08:00:00.000Z`,
          })),
          null,
          30,
          '2026-05-24',
        ),
      }),
      neutralGenome(),
      NOW,
    ).events;
    const line = pickStatusLineFromEvents(events);
    expect(line).toMatch(/noites|ritmo|Descansei/i);
    expect(hasHabitMissedEvent(events)).toBe(true);
  });
});

describe('nudgeGenomeFromAbsence', () => {
  it('null se ausência curta', () => {
    expect(
      nudgeGenomeFromAbsence({ genome: neutralGenome(), absenceHours: 24, mood: 'ok' }),
    ).toBeNull();
  });

  it('aumenta adaptability após 72h+', () => {
    const nudged = nudgeGenomeFromAbsence({
      genome: neutralGenome(),
      absenceHours: 80,
      mood: 'ok',
    });
    expect(nudged).not.toBeNull();
    expect(nudged!.adaptability).toBeGreaterThan(neutralGenome().adaptability);
  });

  it('genes nunca regridem', () => {
    const genome = neutralGenome();
    const nudged = nudgeGenomeFromAbsence({
      genome,
      absenceHours: 200,
      mood: 'triste',
    });
    expect(nudged).not.toBeNull();
    for (const k of Object.keys(genome) as (keyof typeof genome)[]) {
      expect(nudged![k]).toBeGreaterThanOrEqual(genome[k]);
    }
  });
});
