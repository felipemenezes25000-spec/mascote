/**
 * Tipos do Life Simulator — estado persistente e eventos produzidos offline.
 */

import type { HabitKind, MascotMood } from '@/types';
import type { HabitSimContext } from './habitBridge';

/** Estado de vida simulada persistido por usuário. */
export interface LifeState {
  user_id: string;
  energy: number;
  mood: MascotMood;
  /** Último tick de simulação concluído. */
  last_simulated_at: string;
  /** Horas acumuladas desde a última sessão (para behaviors/evolução). */
  absence_hours: number;
  /** Total de horas simuladas desde criação (métrica leve). */
  total_simulated_hours: number;
}

export type SimulationEventKind =
  | 'mood_drift'
  | 'energy_change'
  | 'while_away_moment'
  | 'while_away_living_moment'
  | 'while_away_habit_missed'
  | 'while_away_streak_risk'
  | 'return_summary'
  | 'celebration_return';

export interface SimulationEvent {
  kind: SimulationEventKind;
  at: string;
  /** Micro-copy curta para UI (status bubble / toast). */
  message?: string;
  payload?: {
    fromEnergy?: number;
    toEnergy?: number;
    fromMood?: MascotMood;
    toMood?: MascotMood;
    hoursAway?: number;
    momentTag?: string;
    habitKind?: HabitKind;
    daysMissed?: number;
    streakCurrent?: number;
  };
}

export interface SimTickInput {
  userId: string;
  energy: number;
  mood: MascotMood;
  lastSimulatedAt: string | null;
  lastSeenAt: string;
  /** Horas desde última interação real (last_seen_at). */
  hoursSinceInteraction: number;
  /** Contexto de hábitos (opcional — quando caller lê check-ins). */
  habitContext?: HabitSimContext;
}

export interface SimTickResult {
  lifeState: LifeState;
  energy: number;
  mood: MascotMood;
  events: SimulationEvent[];
  /** Resumo principal para status bubble na Home. */
  summaryLine?: string;
}
