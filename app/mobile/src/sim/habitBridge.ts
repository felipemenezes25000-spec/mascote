/**
 * Ponte hábitos → parâmetros de simulação offline.
 *
 * Lê padrões recentes de check-in (pure) e calcula drift extra de energy/mood
 * quando hábitos regulares ficaram sem registro durante a ausência.
 */

import { habitMeta } from '@/content/missions';
import { addDays, daysBetween, todayLocal } from '@/lib/db';
import type { Checkin, HabitKind, Streak } from '@/types';

/** Hábito regular que ficou sem check-in durante a ausência. */
export interface MissedHabit {
  habit: HabitKind;
  daysMissed: number;
}

export interface HabitSimContext {
  missedHabits: MissedHabit[];
  streakAtRisk: boolean;
  streakCurrent: number;
  /** Multiplicador sobre decay base de energy (>= 1). */
  energyDecayMultiplier: number;
  /** Multiplicador sobre sensibilidade de mood (>= 1). */
  moodSensitivityMultiplier: number;
}

/** Efeito offline por hábito — sleep/exercise têm maior peso. */
const HABIT_OFFLINE_EFFECT: Partial<
  Record<HabitKind, { energyPerDay: number; moodPerDay: number }>
> = {
  sleep: { energyPerDay: 0.12, moodPerDay: 0.06 },
  exercise: { energyPerDay: 0.04, moodPerDay: 0.14 },
  water: { energyPerDay: 0.08, moodPerDay: 0.04 },
  meditation: { energyPerDay: 0.02, moodPerDay: 0.1 },
  breath: { energyPerDay: 0.02, moodPerDay: 0.08 },
  outdoor: { energyPerDay: 0.03, moodPerDay: 0.1 },
  sun: { energyPerDay: 0.02, moodPerDay: 0.06 },
  reading: { energyPerDay: 0.01, moodPerDay: 0.08 },
  journaling: { energyPerDay: 0.01, moodPerDay: 0.07 },
};

const PATTERN_WINDOW_DAYS = 7;
const MIN_HABIT_FREQUENCY = 3;
const MAX_ENERGY_MULT = 1.8;
const MAX_MOOD_MULT = 1.6;

function countByHabit(checkins: readonly Checkin[]): Map<HabitKind, number> {
  const freq = new Map<HabitKind, number>();
  for (const c of checkins) {
    freq.set(c.habit_kind, (freq.get(c.habit_kind) ?? 0) + 1);
  }
  return freq;
}

function lastCheckinFor(
  checkins: readonly Checkin[],
  habit: HabitKind,
): Checkin | undefined {
  return checkins
    .filter(c => c.habit_kind === habit)
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))[0];
}

/** Detecta hábitos com padrão regular nos últimos 7 dias. */
export function detectRegularHabits(
  checkins: readonly Checkin[],
  asOfDate: string = todayLocal(),
): HabitKind[] {
  const windowStart = addDays(asOfDate, -(PATTERN_WINDOW_DAYS - 1));
  const recent = checkins.filter(c => c.occurred_on >= windowStart && c.occurred_on <= asOfDate);
  const freq = countByHabit(recent);
  return [...freq.entries()]
    .filter(([, count]) => count >= MIN_HABIT_FREQUENCY)
    .map(([habit]) => habit);
}

/** Hábitos regulares sem check-in recente o suficiente para cobrir a ausência. */
export function detectMissedHabits(
  checkins: readonly Checkin[],
  elapsedHours: number,
  asOfDate: string = todayLocal(),
): MissedHabit[] {
  if (elapsedHours < 6) return [];

  const regular = detectRegularHabits(checkins, asOfDate);
  if (regular.length === 0) return [];

  const windowStart = addDays(asOfDate, -(PATTERN_WINDOW_DAYS - 1));
  const recent = checkins.filter(c => c.occurred_on >= windowStart && c.occurred_on <= asOfDate);
  const expectedGapDays = Math.max(1, Math.floor(elapsedHours / 24));
  const missed: MissedHabit[] = [];

  for (const habit of regular) {
    const last = lastCheckinFor(recent, habit);
    if (!last) continue;
    const daysSince = daysBetween(last.occurred_on, asOfDate);
    if (daysSince >= expectedGapDays) {
      missed.push({ habit, daysMissed: daysSince });
    }
  }

  return missed.sort((a, b) => b.daysMissed - a.daysMissed);
}

/** Streak em risco após dias sem check-in (usa grace restante). */
export function assessStreakRisk(
  streak: Streak | null | undefined,
  asOfDate: string = todayLocal(),
): boolean {
  if (!streak || streak.current_streak < 3) return false;
  if (!streak.last_active_date || streak.last_active_date === asOfDate) return false;

  const gap = daysBetween(streak.last_active_date, asOfDate);
  if (gap <= 0) return false;

  const skipped = gap;
  if (skipped === 1) return streak.current_streak >= 7;
  return skipped - 1 > streak.grace_days_left || (skipped >= 2 && streak.current_streak >= 5);
}

export function computeHabitDriftMultipliers(missed: readonly MissedHabit[]): {
  energyDecayMultiplier: number;
  moodSensitivityMultiplier: number;
} {
  let energyBonus = 0;
  let moodBonus = 0;

  for (const { habit, daysMissed } of missed) {
    const effect = HABIT_OFFLINE_EFFECT[habit];
    if (!effect) continue;
    const scale = Math.min(daysMissed, 3);
    energyBonus += effect.energyPerDay * scale;
    moodBonus += effect.moodPerDay * scale;
  }

  return {
    energyDecayMultiplier: Math.min(MAX_ENERGY_MULT, 1 + energyBonus),
    moodSensitivityMultiplier: Math.min(MAX_MOOD_MULT, 1 + moodBonus),
  };
}

export function buildHabitSimContext(
  checkins: readonly Checkin[],
  streak: Streak | null | undefined,
  elapsedHours: number,
  asOfDate: string = todayLocal(),
): HabitSimContext {
  const missedHabits = detectMissedHabits(checkins, elapsedHours, asOfDate);
  const { energyDecayMultiplier, moodSensitivityMultiplier } =
    computeHabitDriftMultipliers(missedHabits);
  const streakAtRisk = assessStreakRisk(streak, asOfDate);

  return {
    missedHabits,
    streakAtRisk,
    streakCurrent: streak?.current_streak ?? 0,
    energyDecayMultiplier,
    moodSensitivityMultiplier,
  };
}

/** Micro-copy gentil para evento de hábito perdido (sem cobrança). */
export function habitMissedMessage(habit: HabitKind): string {
  switch (habit) {
    case 'sleep':
      return 'Notei noites mais curtas no seu ritmo. Descansei junto.';
    case 'exercise':
      return 'Seu corpo pediu pausa. Respirei fundo por nós dois.';
    case 'water':
      return 'Sem água anotada há um tempo. Um gole quando der.';
    case 'meditation':
    case 'breath':
      return 'Faltou um respiro no dia. Tô aqui, sem pressa.';
    default:
      return `${habitMeta[habit].emoji} ${habitMeta[habit].label} ficou quieto. Sem pressa.`;
  }
}

export function streakRiskMessage(streakDays: number): string {
  if (streakDays >= 14) {
    return `${streakDays} dias de ritmo. Quando quiser, um check-in leve conta.`;
  }
  return 'Seu ritmo tá firme. Um check-in leve hoje já ajuda.';
}
