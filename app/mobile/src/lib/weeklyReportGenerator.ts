/**
 * Gerador de relatório semanal narrado — memória + hábitos + evolução.
 */

import { generateWeeklyNarrative, type NarrativeReport, type WeeklyData } from '@/lib/narrative';
import { buildEvolutionState } from '@/game/evolution/EvolutionEngine';
import type { Checkin, Mascot, Streak } from '@/types';
import type { PersonalizationInput } from '@/game/evolution/EvolutionTypes';

export interface WeeklyReportInput {
  mascot: Mascot;
  checkins: Checkin[];
  prevWeekCheckins: Checkin[];
  allCheckins: Checkin[];
  streak: Streak | null;
  personalization?: Partial<PersonalizationInput>;
}

export interface WeeklyReportOutput extends NarrativeReport {
  evolutionNote: string;
  microEvolutionCount: number;
  dominantHabitLabel: string | null;
}

const HABIT_LABELS: Record<string, string> = {
  water: 'água',
  sleep: 'sono',
  exercise: 'movimento',
  breath: 'respiração',
  meditation: 'meditação',
  reading: 'leitura',
  journaling: 'escrita',
  outdoor: 'ar livre',
  sun: 'sol',
};

function dominantHabitLabel(checkins: Checkin[]): string | null {
  const counts: Record<string, number> = {};
  for (const c of checkins) {
    counts[c.habit_kind] = (counts[c.habit_kind] ?? 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  return HABIT_LABELS[top[0]] ?? top[0];
}

function evolutionNoteForWeek(
  mascot: Mascot,
  allCheckins: Checkin[],
  streak: Streak | null,
  weekCheckins: Checkin[],
  personalization?: Partial<PersonalizationInput>,
): { note: string; microCount: number } {
  try {
    const state = buildEvolutionState({
      mascot,
      checkins: allCheckins,
      streak,
      personalization,
    });
    const microCount = state.microEvolutions.length;
    const dominant = state.behaviorHistory.dominantHabits[0];
    const habitLabel = dominant ? (HABIT_LABELS[dominant] ?? dominant) : null;

    if (weekCheckins.length === 0) {
      return {
        note: 'Essa semana foi mais quieta. Quando você voltar, eu continuo aqui — sem pressa.',
        microCount,
      };
    }

    if (microCount > 0 && habitLabel) {
      return {
        note: `Notei que ${habitLabel} deixou marcas em mim — ${microCount} micro-mudança${microCount > 1 ? 's' : ''} visível${microCount > 1 ? 'is' : ''} essa semana.`,
        microCount,
      };
    }

    if (state.phenotype.displayModifiers.activeEnergy) {
      return { note: 'Sinto mais energia em mim quando você se move. Continua no seu ritmo.', microCount };
    }
    if (state.phenotype.displayModifiers.calmAura) {
      return { note: 'Fico mais calmo quando você respira e descansa. Obrigado por isso.', microCount };
    }

    return {
      note: `Registramos ${weekCheckins.length} cuidado${weekCheckins.length > 1 ? 's' : ''} essa semana. Cada um conta.`,
      microCount,
    };
  } catch {
    return { note: 'Continue cuidando de você — eu acompanho cada passo.', microCount: 0 };
  }
}

/** Relatório semanal completo com camada de evolução procedural. */
export function generateWeeklyReport(input: WeeklyReportInput): WeeklyReportOutput {
  const xpThisWeek = input.checkins.reduce((s, c) => s + c.xp_awarded, 0);
  const weeklyData: WeeklyData = {
    mascot: input.mascot,
    checkins: input.checkins,
    prevWeekCheckins: input.prevWeekCheckins,
    currentStreak: input.streak?.current_streak ?? 0,
    longestStreak: input.streak?.longest_streak ?? 0,
    xpThisWeek,
  };

  const narrative = generateWeeklyNarrative(weeklyData);
  const { note, microCount } = evolutionNoteForWeek(
    input.mascot,
    input.allCheckins,
    input.streak,
    input.checkins,
    input.personalization,
  );

  return {
    ...narrative,
    evolutionNote: note,
    microEvolutionCount: microCount,
    dominantHabitLabel: dominantHabitLabel(input.checkins),
  };
}
