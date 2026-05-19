/**
 * Orquestrador central do motor de evolução procedural.
 */

import type { Checkin, Mascot, MascotMood, MascotPhase, Personality, Streak } from '@/types';
import type { UnlockedMutation } from '@/lib/dna/mutations';
import { sanitizeGenome } from '@/lib/dna/genome';
import { phaseFromXp } from '@/lib/xp';
import type {
  BehaviorHistory,
  EvolutionPreview,
  EvolutionState,
  MicroEvolution,
  PersonalizationInput,
} from './EvolutionTypes';
import {
  calculateTotalEvolutionCombinations,
  calculateEffectiveCombinations,
  phenotypeFingerprint,
} from './EvolutionMath';
import { generateGenotype } from './GenotypeGenerator';
import { generatePhenotype } from './PhenotypeGenerator';
import { buildBehaviorHistory, emptyBehaviorHistory } from './BehaviorEngine';
import { eligibleMicroEvolutions } from './EvolutionMilestones';
import { enrichPhenotypeVisuals } from './VisualEvolutionEngine';
import { firstWordsForPreview, rareTraitLabel } from './PersonalityEngine';
import { loadEvolutionState, saveEvolutionState } from './EvolutionPersistence';
import { buildEvolutionTimeline } from './EvolutionTimeline';

export {
  calculateTotalEvolutionCombinations,
  calculateEffectiveCombinations,
  phenotypeFingerprint,
};

export interface EvolutionPathStep {
  dayIndex: number;
  habit: string;
  microEvolution?: MicroEvolution;
  phase: MascotPhase;
  fingerprint: string;
}

/** Preview determinístico para onboarding — seed → genótipo + fenótipo. */
export function generateEvolutionPreview(
  input: PersonalizationInput,
): EvolutionPreview {
  const genotype = generateGenotype(input);
  const history = emptyBehaviorHistory();
  const phenotype = generatePhenotype(
    genotype,
    'ovo',
    'empolgado',
    history,
    0,
    [],
  );
  return {
    seed: input.seed,
    genotype,
    phenotype,
    rareTraitLabel: rareTraitLabel(genotype),
    firstWords: firstWordsForPreview(genotype, input.mascotName),
  };
}

/** Simula caminho de evolução a partir de histórico comportamental. */
export function generateUserMascotEvolutionPath(
  input: PersonalizationInput,
  behaviorHistory: BehaviorHistory,
  totalDays = 30,
): EvolutionPathStep[] {
  const genotype = generateGenotype(input);
  const steps: EvolutionPathStep[] = [];
  let xp = 0;
  let microLevel = 0;
  const unlockedMicro: string[] = [];

  for (let day = 0; day < totalDays; day++) {
    const habit = behaviorHistory.dominantHabits[day % Math.max(1, behaviorHistory.dominantHabits.length)] ?? 'water';
    xp += 10;
    const phase = phaseFromXp(xp);
    const simHistory: BehaviorHistory = {
      ...behaviorHistory,
      habitCounts: {
        ...behaviorHistory.habitCounts,
        [habit]: (behaviorHistory.habitCounts[habit as keyof typeof behaviorHistory.habitCounts] ?? 0) + day + 1,
      },
    };
    const newMicro = eligibleMicroEvolutions(simHistory.habitCounts, unlockedMicro);
    let microEvolution: MicroEvolution | undefined;
    if (newMicro.length > 0) {
      microEvolution = newMicro[0];
      unlockedMicro.push(microEvolution.id);
      microLevel += 1;
    }
    const phenotype = generatePhenotype(genotype, phase, 'feliz', simHistory, microLevel, []);
    steps.push({
      dayIndex: day,
      habit,
      microEvolution,
      phase,
      fingerprint: phenotypeFingerprint(phenotype.slots),
    });
  }
  return steps;
}

export interface BuildEvolutionInput {
  mascot: Mascot;
  checkins: readonly Checkin[];
  streak: Streak | null;
  unlockedMutations?: UnlockedMutation[];
  mood?: MascotMood;
  personalization?: Partial<PersonalizationInput>;
}

/** Constrói estado completo de evolução a partir do mascote persistido. */
export function buildEvolutionState(input: BuildEvolutionInput): EvolutionState {
  const { mascot, checkins, streak, unlockedMutations = [], mood = mascot.mood } = input;
  const genome = sanitizeGenome(mascot.dna ?? {});
  const seed = mascot.dna_seed ?? 0;

  const personalization: PersonalizationInput = {
    seed,
    personality: mascot.personality,
    mascotName: mascot.name,
    bondType: input.personalization?.bondType ?? 'companheiro',
    userGoal: input.personalization?.userGoal ?? 'saude_geral',
    communicationTone: input.personalization?.communicationTone ?? 'carinhoso',
    ...input.personalization,
  };

  const genotype = generateGenotype(personalization);
  const behaviorHistory = buildBehaviorHistory({ checkins, streak, mood });
  const alreadyUnlocked = checkins.length > 0 ? [] as string[] : [];
  const microEvolutions = eligibleMicroEvolutions(behaviorHistory.habitCounts, alreadyUnlocked);
  const microLevel = microEvolutions.length;

  let phenotype = generatePhenotype(
    genotype,
    mascot.phase,
    mood,
    behaviorHistory,
    microLevel,
    unlockedMutations,
  );
  phenotype = enrichPhenotypeVisuals(phenotype, genotype.genome, behaviorHistory, microEvolutions);

  return {
    genotype,
    phenotype,
    behaviorHistory,
    microEvolutions,
    totalXp: mascot.xp,
    mascotPhase: mascot.phase,
  };
}

/** Após check-in: detecta novas microevoluções e persiste. */
export async function processEvolutionAfterCheckin(
  userId: string,
  state: EvolutionState,
): Promise<{ state: EvolutionState; newMicro: MicroEvolution[] }> {
  const persisted = await loadEvolutionState(userId);
  const already = persisted?.microEvolutions.map(m => m.id) ?? state.microEvolutions.map(m => m.id);
  const newMicro = eligibleMicroEvolutions(state.behaviorHistory.habitCounts, already)
    .filter(m => !already.includes(m.id));

  const allMicro = [...(persisted?.microEvolutions ?? state.microEvolutions), ...newMicro];
  const microLevel = allMicro.length;

  let phenotype = generatePhenotype(
    state.genotype,
    state.mascotPhase,
    state.phenotype.mood,
    state.behaviorHistory,
    microLevel,
    state.phenotype.activeMutations,
  );
  phenotype = enrichPhenotypeVisuals(phenotype, state.genotype.genome, state.behaviorHistory, allMicro);

  const next: EvolutionState = {
    ...state,
    phenotype,
    microEvolutions: allMicro,
  };

  await saveEvolutionState(userId, {
    microEvolutions: allMicro,
    microEvolutionLevel: microLevel,
  });

  return { state: next, newMicro };
}

export function getEvolutionTimeline(state: EvolutionState): ReturnType<typeof buildEvolutionTimeline> {
  return buildEvolutionTimeline({
    macroPhases: [{ phase: state.phenotype.macroPhase, at: new Date().toISOString() }],
    microEvolutions: state.microEvolutions,
    mutations: state.phenotype.activeMutations,
    recoveries: state.behaviorHistory.recoveries,
  });
}

/** Alias PT-BR solicitado na spec. */
export const calcularTotalEvolutionCombinations = calculateTotalEvolutionCombinations;
