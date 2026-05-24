/**
 * Marcos macro (fases) e micro (por hábito/XP).
 */

import type { MascotPhase } from '@/types';
import type { HabitKind } from '@/types';
import type { MacroPhaseId, MicroEvolution } from './EvolutionTypes';
import { MICRO_EVOLUTION_CATALOG } from './MicroEvolutionCatalog';

export interface MacroMilestone {
  id: MacroPhaseId;
  label: string;
  xpThreshold: number;
  mascotPhase: MascotPhase;
}

export const MACRO_MILESTONES: readonly MacroMilestone[] = [
  { id: 'ovo', label: 'Ovo', xpThreshold: 0, mascotPhase: 'ovo' },
  { id: 'bebe', label: 'Bebê', xpThreshold: 100, mascotPhase: 'bebe' },
  { id: 'crianca', label: 'Criança', xpThreshold: 500, mascotPhase: 'crianca' },
  { id: 'jovem', label: 'Jovem', xpThreshold: 2000, mascotPhase: 'adolescente' },
  { id: 'adulto', label: 'Adulto', xpThreshold: 8000, mascotPhase: 'adulto' },
  { id: 'avancada', label: 'Forma avançada', xpThreshold: 15000, mascotPhase: 'adulto' },
  { id: 'lendaria', label: 'Lendária', xpThreshold: 25000, mascotPhase: 'evoluido' },
] as const;

export function macroPhaseFromMascotPhase(phase: MascotPhase): MacroPhaseId {
  switch (phase) {
    case 'ovo': return 'ovo';
    case 'bebe': return 'bebe';
    case 'crianca': return 'crianca';
    case 'adolescente': return 'jovem';
    case 'adulto': return 'adulto';
    case 'evoluido': return 'lendaria';
    default: return 'ovo';
  }
}

export function macroPhaseFromXp(xp: number): MacroPhaseId {
  let phase: MacroPhaseId = 'ovo';
  for (const m of MACRO_MILESTONES) {
    if (xp >= m.xpThreshold) phase = m.id;
  }
  return phase;
}

/** Microevoluções elegíveis dado histórico — sem duplicar IDs já desbloqueados. */
export function eligibleMicroEvolutions(
  habitCounts: Partial<Record<HabitKind, number>>,
  alreadyUnlocked: readonly string[],
  currentStreak: number = 0,
): MicroEvolution[] {
  const unlocked = new Set(alreadyUnlocked);
  const result: MicroEvolution[] = [];
  const now = new Date().toISOString();

  for (const entry of MICRO_EVOLUTION_CATALOG) {
    if (unlocked.has(entry.id)) continue;
    const count = entry.habitAffinity
      ? (habitCounts[entry.habitAffinity] ?? 0)
      : entry.id === 'micro-recovery-bloom'
        ? currentStreak
        : Object.values(habitCounts).reduce((a, b) => a + (b ?? 0), 0);
    if (count >= entry.requiredCheckins) {
      result.push({
        id: entry.id,
        label: entry.label,
        magnitude: entry.magnitude,
        habitAffinity: entry.habitAffinity,
        unlockedAt: now,
      });
    }
  }
  return result;
}

/**
 * Trigger de "forma rara" baseado no catálogo de microevoluções.
 *
 * Regra mínima: qualquer micro recém-desbloqueada com magnitude alta (>= 0.26)
 * é tratada como gatilho raro. Hoje isso cobre marcos finais como
 * `micro-streak-crown` sem criar uma tabela paralela de raridade.
 */
export function hasRareFormTrigger(newMicro: readonly MicroEvolution[]): boolean {
  return newMicro.some(m => m.magnitude >= 0.26);
}
