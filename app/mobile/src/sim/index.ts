export type {
  LifeState,
  SimulationEvent,
  SimulationEventKind,
  SimTickInput,
  SimTickResult,
} from './types';

export { genomeToSimParams, type SimGenomeParams } from './genomeBridge';
export {
  buildHabitSimContext,
  detectMissedHabits,
  detectRegularHabits,
  assessStreakRisk,
  computeHabitDriftMultipliers,
  habitMissedMessage,
  streakRiskMessage,
  type HabitSimContext,
  type MissedHabit,
} from './habitBridge';
export { nudgeGenomeFromAbsence, nudgeGenomeFromHabits, mergeGenomeNudges, type AbsenceEvolutionInput, type HabitEvolutionInput } from './evolutionBridge';
export { generateLivingMoment, type LivingMomentInput } from './livingMoments';
export {
  runLifeTick,
  pickStatusLineFromEvents,
  hasReturnCelebration,
  hasHabitMissedEvent,
  hasStreakRiskEvent,
} from './LifeSimulator';
export { orchestrateLifeSimulation, type OrchestrateResult } from './orchestrate';
