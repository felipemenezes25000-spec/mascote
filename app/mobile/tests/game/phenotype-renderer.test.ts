import { describe, expect, it } from 'vitest';
import { generatePhenotype } from '@/game/evolution/PhenotypeGenerator';
import { generateGenotype } from '@/game/evolution/GenotypeGenerator';
import { emptyBehaviorHistory } from '@/game/evolution/BehaviorEngine';
import {
  modifiersToVisuals,
  phenotypeToMascotVisuals,
} from '@/game/evolution/PhenotypeRenderer';
import { applyHabitVisualBias } from '@/game/evolution/EvolutionRules';

const baseInput = {
  seed: 42,
  personality: 'calmo' as const,
  mascotName: 'Lumi',
  bondType: 'companheiro' as const,
  userGoal: 'saude_geral' as const,
  communicationTone: 'carinhoso' as const,
};

describe('PhenotypeRenderer', () => {
  it('mapeia displayModifiers para props visuais', () => {
    const genotype = generateGenotype(baseInput);
    const history = {
      ...emptyBehaviorHistory(),
      habitCounts: { exercise: 20 },
      dominantHabits: ['exercise' as const],
    };
    const phenotype = generatePhenotype(genotype, 'bebe', 'feliz', history, 2, []);
    const visuals = phenotypeToMascotVisuals(phenotype);

    expect(visuals.glowMultiplier).toBeGreaterThan(1);
    expect(visuals.activeEnergy).toBe(true);
    expect(visuals.bodyScaleMultiplier).toBeGreaterThan(1);
    expect(visuals.environmentTint).toMatch(/^#[0-9a-f]{6}$/i);
    expect(visuals.idleAnimation).toBe('active');
  });

  it('zenParticles altera idle para zen', () => {
    const mods = applyHabitVisualBias({
      ...emptyBehaviorHistory(),
      habitCounts: { meditation: 25 },
    }, 1);
    const visuals = modifiersToVisuals(mods, 0, 2);
    expect(visuals.zenParticles).toBe(true);
    expect(visuals.idleAnimation).toBe('zen');
  });

  it('animationSet mapeia idle quando sem modificadores dominantes', () => {
    const mods = applyHabitVisualBias(emptyBehaviorHistory(), 0);
    const visuals = modifiersToVisuals(mods, 3, 0);
    expect(visuals.idleAnimation).toBe('bounce');
  });
});
