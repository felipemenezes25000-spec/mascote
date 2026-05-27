/**
 * LifeSimulator — tick offline/online baseado em last_seen_at, genoma, mood e energy.
 *
 * Produz eventos (mood drift, energy change, "while you were away") sem cobrança.
 * Puro: não persiste — caller grava via mascot-life + mascots.upsert.
 */

import { deriveMoodFromState } from '@/lib/xp';
import type { Genome } from '@/lib/dna/genome';
import type { MascotMood } from '@/types';
import { genomeToSimParams } from './genomeBridge';
import { habitMissedMessage, streakRiskMessage } from './habitBridge';
import { generateLivingMoment } from './livingMoments';
import type { LifeState, SimTickInput, SimTickResult, SimulationEvent } from './types';

const MIN_TICK_HOURS = 0.05; // ~3 min — evita micro-ticks a cada focus
const ENERGY_FLOOR = 12;

function clampEnergy(v: number): number {
  // NaN bypass guard: Math.round(NaN)===NaN, e min/max(NaN, x) propaga NaN
  // — sem essa guarda, energy corrompido (import malformado, divisão por 0
  // upstream) virava NaN persistido em mascot_life, e UI mostrava "NaN%".
  if (!Number.isFinite(v)) return ENERGY_FLOOR;
  return Math.max(ENERGY_FLOOR, Math.min(100, Math.round(v)));
}

function freshLifeState(userId: string, energy: number, mood: MascotMood, at: string): LifeState {
  return {
    user_id: userId,
    energy,
    mood,
    last_simulated_at: at,
    absence_hours: 0,
    total_simulated_hours: 0,
  };
}

export function runLifeTick(
  input: SimTickInput,
  genome: Genome,
  nowMs: number = Date.now(),
): SimTickResult {
  const nowIso = new Date(nowMs).toISOString();
  const anchor = input.lastSimulatedAt ?? input.lastSeenAt;
  const elapsedHours = Math.max(0, (nowMs - new Date(anchor).getTime()) / 3_600_000);
  const params = genomeToSimParams(genome);

  if (elapsedHours < MIN_TICK_HOURS) {
    const state = input.lastSimulatedAt
      ? {
          user_id: input.userId,
          energy: input.energy,
          mood: input.mood,
          last_simulated_at: input.lastSimulatedAt,
          absence_hours: input.hoursSinceInteraction,
          total_simulated_hours: 0,
        }
      : freshLifeState(input.userId, input.energy, input.mood, nowIso);
    return {
      lifeState: state,
      energy: input.energy,
      mood: input.mood,
      events: [],
    };
  }

  const events: SimulationEvent[] = [];
  const fromEnergy = input.energy;
  const fromMood = input.mood;
  const habitCtx = input.habitContext;

  const energyMult = habitCtx?.energyDecayMultiplier ?? 1;
  const moodMult = habitCtx?.moodSensitivityMultiplier ?? 1;
  const decay = Math.min(elapsedHours * params.energyDecayPerHour * energyMult, 45);
  const toEnergy = clampEnergy(fromEnergy - decay);

  const simMascot = { energy: toEnergy, mood: fromMood } as { energy: number; mood: MascotMood };
  let toMood = deriveMoodFromState(
    simMascot as import('@/types').Mascot,
    elapsedHours * params.moodSensitivity * moodMult,
  );

  if (decay >= 0.5) {
    events.push({
      kind: 'energy_change',
      at: nowIso,
      message: toEnergy < 40 ? 'Descansou um pouco enquanto você estava fora.' : undefined,
      payload: { fromEnergy, toEnergy, hoursAway: elapsedHours },
    });
  }

  if (toMood !== fromMood) {
    events.push({
      kind: 'mood_drift',
      at: nowIso,
      payload: { fromMood, toMood, hoursAway: elapsedHours },
    });
  }

  if (elapsedHours >= params.awayMomentThresholdHours) {
    const awayMsg =
      elapsedHours >= 72
        ? 'Fiquei no meu canto. Sem pressa — bom te ver.'
        : elapsedHours >= 24
          ? 'Passou um tempo. Eu fiquei aqui, quieto.'
          : 'Enquanto você estava fora, respirei fundo.';
    events.push({
      kind: 'while_away_moment',
      at: nowIso,
      message: awayMsg,
      payload: { hoursAway: elapsedHours },
    });
  }

  const livingMoment = generateLivingMoment({
    hoursAway: elapsedHours,
    mood: toMood,
    energy: toEnergy,
    nowMs,
  });
  if (livingMoment) {
    events.push({
      kind: 'while_away_living_moment',
      at: nowIso,
      message: livingMoment.message,
      payload: { hoursAway: elapsedHours, momentTag: livingMoment.tag },
    });
  }

  if (habitCtx?.missedHabits.length) {
    const primary = habitCtx.missedHabits[0];
    const msg = habitMissedMessage(primary.habit);
    events.push({
      kind: 'while_away_habit_missed',
      at: nowIso,
      message: msg,
      payload: {
        habitKind: primary.habit,
        daysMissed: primary.daysMissed,
        hoursAway: elapsedHours,
      },
    });
  }

  if (habitCtx?.streakAtRisk) {
    const streakDays = habitCtx.streakCurrent;
    events.push({
      kind: 'while_away_streak_risk',
      at: nowIso,
      message: streakRiskMessage(streakDays),
      payload: { hoursAway: elapsedHours, streakCurrent: streakDays },
    });
  }

  let summaryLine: string | undefined;

  if (input.hoursSinceInteraction >= 24 || elapsedHours >= 24) {
    const days = Math.floor(Math.max(input.hoursSinceInteraction, elapsedHours) / 24);
    summaryLine =
      days >= 3
        ? `Fiquei aqui ${days} dias. Sem cobrança — só feliz que voltou.`
        : `Enquanto você estava fora, cuidei do meu ritmo.`;
    events.push({
      kind: 'return_summary',
      at: nowIso,
      message: summaryLine,
      payload: { hoursAway: Math.max(input.hoursSinceInteraction, elapsedHours) },
    });
    if (days >= 1) {
      events.push({
        kind: 'celebration_return',
        at: nowIso,
        payload: { hoursAway: Math.max(input.hoursSinceInteraction, elapsedHours) },
      });
    }
  } else if (toMood === 'triste' || toMood === 'exausto') {
    summaryLine = 'Um pouco quieto... mas aqui por você.';
  }

  const lifeState: LifeState = {
    user_id: input.userId,
    energy: toEnergy,
    mood: toMood,
    last_simulated_at: nowIso,
    absence_hours: Math.max(input.hoursSinceInteraction, elapsedHours),
    total_simulated_hours: elapsedHours,
  };

  return { lifeState, energy: toEnergy, mood: toMood, events, summaryLine };
}

/** Linha curta para status bubble a partir dos eventos mais recentes. */
export function pickStatusLineFromEvents(events: readonly SimulationEvent[]): string | undefined {
  const returnEv = events.find(e => e.kind === 'return_summary');
  if (returnEv?.message) return returnEv.message;
  const habitEv = events.find(e => e.kind === 'while_away_habit_missed');
  if (habitEv?.message) return habitEv.message;
  const streakEv = events.find(e => e.kind === 'while_away_streak_risk');
  if (streakEv?.message) return streakEv.message;
  const awayEv = events.find(e => e.kind === 'while_away_moment');
  if (awayEv?.message) return awayEv.message;
  const livingEv = events.find(e => e.kind === 'while_away_living_moment');
  if (livingEv?.message) return livingEv.message;
  const moodEv = events.find(e => e.kind === 'mood_drift');
  if (moodEv?.payload?.toMood === 'triste') return 'Senti sua falta, mas sem pressa.';
  if (moodEv?.payload?.toMood === 'exausto') return 'Precisando de descanso — sem pressa.';
  return undefined;
}

/** Indica se há evento de retorno para efeitos visuais (celebração). */
export function hasReturnCelebration(events: readonly SimulationEvent[]): boolean {
  return events.some(e => e.kind === 'celebration_return');
}

export function hasHabitMissedEvent(events: readonly SimulationEvent[]): boolean {
  return events.some(e => e.kind === 'while_away_habit_missed');
}

export function hasStreakRiskEvent(events: readonly SimulationEvent[]): boolean {
  return events.some(e => e.kind === 'while_away_streak_risk');
}
