/**
 * Orquestra tick de simulação + persistência + evolução sutil.
 */

import { mascots, mascotLife, checkins, streaks, todayLocal } from '@/lib/db';
import { sanitizeGenome } from '@/lib/dna';
import { recordSimulationMemories } from '@/lib/memory/simulation';
import type { Mascot } from '@/types';
import { nudgeGenomeFromAbsence, nudgeGenomeFromHabits, mergeGenomeNudges } from './evolutionBridge';
import { buildHabitSimContext, detectRegularHabits } from './habitBridge';
import { runLifeTick, pickStatusLineFromEvents } from './LifeSimulator';
import type { LifeState, SimulationEvent } from './types';

export interface OrchestrateResult {
  mascot: Mascot;
  lifeState: LifeState;
  events: SimulationEvent[];
  summaryLine?: string;
  genomeUpdated: boolean;
}

export async function orchestrateLifeSimulation(mascot: Mascot): Promise<OrchestrateResult> {
  const genome = mascot.dna ? sanitizeGenome(mascot.dna) : null;
  const stored = await mascotLife.get(mascot.user_id);
  const now = Date.now();
  const hoursSinceInteraction = Math.max(
    0,
    (now - new Date(mascot.last_seen_at).getTime()) / 3_600_000,
  );

  if (!genome) {
    const fallback = stored ?? (await mascotLife.getOrFresh(mascot.user_id));
    return {
      mascot,
      lifeState: fallback,
      events: [],
      genomeUpdated: false,
    };
  }

  const anchor = stored?.last_simulated_at ?? mascot.last_seen_at;
  const elapsedHours = Math.max(0, (now - new Date(anchor).getTime()) / 3_600_000);
  const [allCheckins, streak] = await Promise.all([
    checkins.listAll(mascot.user_id),
    streaks.get(mascot.user_id),
  ]);
  const habitContext = buildHabitSimContext(allCheckins, streak, elapsedHours, todayLocal());
  const regularHabits = detectRegularHabits(allCheckins, todayLocal());

  const tick = runLifeTick(
    {
      userId: mascot.user_id,
      energy: stored?.energy ?? mascot.energy,
      mood: stored?.mood ?? mascot.mood,
      lastSimulatedAt: stored?.last_simulated_at ?? null,
      lastSeenAt: mascot.last_seen_at,
      hoursSinceInteraction,
      habitContext,
    },
    genome,
    now,
  );

  let nextMascot: Mascot = {
    ...mascot,
    energy: tick.energy,
    mood: tick.mood,
  };

  let genomeUpdated = false;
  const nudged = mergeGenomeNudges(
    genome,
    nudgeGenomeFromAbsence({
      genome,
      absenceHours: tick.lifeState.absence_hours,
      mood: tick.mood,
    }),
    nudgeGenomeFromHabits({
      genome,
      regularHabits,
      missedHabits: habitContext.missedHabits,
    }),
  );
  if (nudged) {
    const persisted = await mascots.updateDna(mascot.user_id, nudged, { touchLastSeen: false });
    if (persisted) {
      nextMascot = persisted;
      genomeUpdated = true;
    }
  }
  if (tick.energy !== nextMascot.energy || tick.mood !== nextMascot.mood) {
    const persisted = await mascots.updateVitals(mascot.user_id, {
      energy: tick.energy,
      mood: tick.mood,
    });
    if (persisted) nextMascot = persisted;
  }

  await mascotLife.upsert(tick.lifeState);
  await recordSimulationMemories(mascot.user_id, tick.events);

  const summaryLine = tick.summaryLine ?? pickStatusLineFromEvents(tick.events);

  return {
    mascot: nextMascot,
    lifeState: tick.lifeState,
    events: tick.events,
    summaryLine,
    genomeUpdated,
  };
}
