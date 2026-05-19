/**
 * Testes do motor de evolução procedural.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  calculateTotalEvolutionCombinations,
  calcularTotalEvolutionCombinations,
  generateEvolutionPreview,
  generateUserMascotEvolutionPath,
  buildEvolutionState,
  phenotypeFingerprint,
} from '@/game/evolution/EvolutionEngine';
import { generateGenotype, seedFromUserId } from '@/game/evolution/GenotypeGenerator';
import { generatePhenotype } from '@/game/evolution/PhenotypeGenerator';
import { emptyBehaviorHistory, buildBehaviorHistory } from '@/game/evolution/BehaviorEngine';
import { eligibleMicroEvolutions } from '@/game/evolution/EvolutionMilestones';
import { applyHabitVisualBias } from '@/game/evolution/EvolutionRules';
import type { Mascot, Checkin, Streak } from '@/types';

const baseMascot: Mascot = {
  id: 'm1',
  user_id: 'u1',
  name: 'Lumi',
  personality: 'fofo',
  phase: 'bebe',
  mood: 'feliz',
  xp: 150,
  level: 2,
  energy: 80,
  health: 90,
  dna_seed: 12345,
  dna: {
    empathy: 0.7, curiosity: 0.6, creativity: 0.5, discipline: 0.4,
    chaos: 0.3, aggression: 0.2, resilience: 0.6, emotionalDepth: 0.7,
    socialEnergy: 0.5, adaptability: 0.6, intelligence: 0.5,
  },
  last_seen_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

describe('EvolutionEngine — combinações', () => {
  it('calculateTotalEvolutionCombinations > 1000', () => {
    const total = calculateTotalEvolutionCombinations();
    expect(total).toBeGreaterThan(1000);
    expect(calcularTotalEvolutionCombinations()).toBe(total);
  });
});

describe('EvolutionEngine — determinismo de seed', () => {
  it('mesmo seed produz mesmo preview', () => {
    const input = {
      seed: 999,
      personality: 'calmo' as const,
      mascotName: 'Bipo',
      bondType: 'companheiro' as const,
      userGoal: 'sono' as const,
      communicationTone: 'carinhoso' as const,
    };
    const a = generateEvolutionPreview(input);
    const b = generateEvolutionPreview(input);
    expect(a.genotype.archetype).toBe(b.genotype.archetype);
    expect(phenotypeFingerprint(a.phenotype.slots)).toBe(phenotypeFingerprint(b.phenotype.slots));
  });

  it('seeds diferentes produzem fenótipos diferentes', () => {
    const mk = (seed: number) => generateEvolutionPreview({
      seed,
      personality: 'fofo',
      mascotName: 'X',
      bondType: 'companheiro',
      userGoal: 'saude_geral',
      communicationTone: 'carinhoso',
    });
    const a = mk(1);
    const b = mk(2);
    expect(phenotypeFingerprint(a.phenotype.slots)).not.toBe(phenotypeFingerprint(b.phenotype.slots));
  });

  it('userIds diferentes geram seeds diferentes', () => {
    expect(seedFromUserId('alice')).not.toBe(seedFromUserId('bob'));
  });
});

describe('EvolutionEngine — hábitos mudam evolução', () => {
  it('hábitos dominantes alteram modificadores visuais', () => {
    const genotype = generateGenotype({
      seed: 42,
      personality: 'motivador',
      mascotName: 'Z',
      bondType: 'companheiro',
      userGoal: 'foco',
      communicationTone: 'direto',
    });
    const waterHistory = buildBehaviorHistory({
      checkins: Array.from({ length: 10 }, (_, i) => ({
        id: `c1-${i}`, user_id: 'u', habit_kind: 'water' as const, value: 1, unit: null,
        occurred_on: '2026-01-01', occurred_at: '2026-01-01', xp_awarded: 10,
        idempotency_key: `k1-${i}`, created_at: '2026-01-01',
      })),
      streak: null,
    });
    const exerciseHistory = buildBehaviorHistory({
      checkins: Array.from({ length: 10 }, (_, i) => ({
        id: `c2-${i}`, user_id: 'u', habit_kind: 'exercise' as const, value: 1, unit: null,
        occurred_on: '2026-01-01', occurred_at: '2026-01-01', xp_awarded: 10,
        idempotency_key: `k2-${i}`, created_at: '2026-01-01',
      })),
      streak: null,
    });
    const pWater = generatePhenotype(genotype, 'bebe', 'feliz', waterHistory, 2);
    const pExercise = generatePhenotype(genotype, 'bebe', 'feliz', exerciseHistory, 2);
    expect(pWater.displayModifiers.activeEnergy).not.toBe(pExercise.displayModifiers.activeEnergy);
    expect(pExercise.displayModifiers.bodyFirmness).toBeGreaterThan(pWater.displayModifiers.bodyFirmness);
  });

  it('microevolução desbloqueia no primeiro check-in de água', () => {
    const micro = eligibleMicroEvolutions({ water: 1 }, []);
    expect(micro.some(m => m.id === 'micro-water-shimmer')).toBe(true);
  });
});

describe('EvolutionEngine — sem punição por inatividade', () => {
  it('inatividade não reduz glow abaixo de baseline', () => {
    const inactive = applyHabitVisualBias({
      ...emptyBehaviorHistory(),
      failuresSinceLastActive: 10,
      recoveries: 0,
    }, 0);
    expect(inactive.glowMultiplier).toBeGreaterThanOrEqual(1);
    expect(inactive.missedYouTone).toBe(true);
  });

  it('recuperação remove tom de saudade', () => {
    const recovered = applyHabitVisualBias({
      ...emptyBehaviorHistory(),
      failuresSinceLastActive: 5,
      recoveries: 1,
      currentStreak: 1,
    }, 0);
    expect(recovered.missedYouTone).toBe(false);
  });
});

describe('EvolutionEngine — path e state', () => {
  it('generateUserMascotEvolutionPath produz passos', () => {
    const history = buildBehaviorHistory({
      checkins: [],
      streak: { user_id: 'u', current_streak: 3, longest_streak: 3, last_active_date: '2026-01-01', grace_days_left: 2, updated_at: '2026-01-01' },
    });
    history.dominantHabits = ['water', 'sleep'];
    const path = generateUserMascotEvolutionPath({
      seed: 7,
      personality: 'sabio',
      mascotName: 'A',
      bondType: 'espirito',
      userGoal: 'ansiedade',
      communicationTone: 'poetico',
    }, history, 10);
    expect(path.length).toBe(10);
    expect(path[0]!.fingerprint).toBeTruthy();
  });

  it('buildEvolutionState integra mascote + checkins', () => {
    const checkins: Checkin[] = Array.from({ length: 5 }, (_, i) => ({
      id: `c${i}`,
      user_id: 'u1',
      habit_kind: 'meditation',
      value: 5,
      unit: 'min',
      occurred_on: '2026-05-01',
      occurred_at: '2026-05-01T10:00:00Z',
      xp_awarded: 10,
      idempotency_key: `k${i}`,
      created_at: '2026-05-01T10:00:00Z',
    }));
    const streak: Streak = {
      user_id: 'u1',
      current_streak: 5,
      longest_streak: 5,
      last_active_date: '2026-05-01',
      grace_days_left: 3,
      updated_at: '2026-05-01',
    };
    const state = buildEvolutionState({ mascot: baseMascot, checkins, streak });
    expect(state.genotype.seed).toBe(12345);
    expect(state.behaviorHistory.habitCounts.meditation).toBe(5);
  });
});

describe('EvolutionEngine — property: fingerprints únicos', () => {
  it('100 seeds distintos geram fenótipos distintos na maioria', () => {
    const fps = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      const preview = generateEvolutionPreview({
        seed,
        personality: 'fofo',
        mascotName: 'T',
        bondType: 'companheiro',
        userGoal: 'saude_geral',
        communicationTone: 'carinhoso',
      });
      fps.add(phenotypeFingerprint(preview.phenotype.slots));
    }
    expect(fps.size).toBeGreaterThan(90);
  });

  it('fc: combinações sempre positivas', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), microCount => {
        const total = calculateTotalEvolutionCombinations();
        expect(total).toBeGreaterThan(1000);
        expect(total * Math.max(1, microCount)).toBeGreaterThan(1000);
      }),
      { numRuns: 20 },
    );
  });
});
