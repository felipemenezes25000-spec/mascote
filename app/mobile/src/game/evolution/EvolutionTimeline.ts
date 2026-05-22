/**
 * Linha do tempo de eventos de evolução.
 */

import type { MacroPhaseId, MicroEvolution } from './EvolutionTypes';
import { getMutationById, type UnlockedMutation } from '@/lib/dna/mutations';

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
    // Resolve `mutation_id` (técnico, ex.: `mut.bioluminescent_form`) pro
    // `name` humano em PT-BR catalogado (ex.: "Forma bioluminescente"). Sem
    // isso a UI mostrava o ID cru na timeline, vazando jargão interno e
    // confundindo o usuário.
    const meta = getMutationById(mut.mutation_id);
    events.push({
      id: mut.mutation_id,
      kind: 'mutation',
      label: meta?.name ?? mut.mutation_id,
      at: mut.unlocked_at,
      detail: meta?.description,
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
