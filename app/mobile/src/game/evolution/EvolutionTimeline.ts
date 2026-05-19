/**
 * Linha do tempo de eventos de evolução.
 */

import type { MacroPhaseId, MicroEvolution } from './EvolutionTypes';
import type { UnlockedMutation } from '@/lib/dna/mutations';

export type TimelineEventKind = 'macro_phase' | 'micro_evolution' | 'mutation' | 'recovery';

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  label: string;
  at: string;
  detail?: string;
}

export function buildEvolutionTimeline(input: {
  macroPhases: Array<{ phase: MacroPhaseId; at: string }>;
  microEvolutions: readonly MicroEvolution[];
  mutations: readonly UnlockedMutation[];
  recoveries: number;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const p of input.macroPhases) {
    events.push({
      id: `macro-${p.phase}`,
      kind: 'macro_phase',
      label: `Fase ${p.phase}`,
      at: p.at,
    });
  }
  for (const m of input.microEvolutions) {
    events.push({
      id: m.id,
      kind: 'micro_evolution',
      label: m.label,
      at: m.unlockedAt,
    });
  }
  for (const mut of input.mutations) {
    events.push({
      id: mut.mutation_id,
      kind: 'mutation',
      label: mut.mutation_id,
      at: mut.unlocked_at,
    });
  }
  if (input.recoveries > 0) {
    events.push({
      id: 'recovery',
      kind: 'recovery',
      label: 'Retorno acolhedor',
      at: new Date().toISOString(),
      detail: 'Você voltou — ela floresce de novo.',
    });
  }

  return events.sort((a, b) => b.at.localeCompare(a.at));
}
