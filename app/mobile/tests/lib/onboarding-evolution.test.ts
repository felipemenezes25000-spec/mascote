import { describe, expect, it } from 'vitest';
import {
  buildPersonalizationInput,
  generateOnboardingPreview,
  mapGoalToUserGoal,
  mapMoodToMascot,
  seedFromOnboardingAnswers,
  type OnboardingAnswers,
} from '@/lib/onboarding-evolution';

const answers: OnboardingAnswers = {
  goalId: 'sono',
  moodId: '4',
  stylePreset: 'mystic',
  bondType: 'espirito',
  communicationTone: 'poetico',
  pronoun: 'ela',
  primaryGoal: 'sono',
};

describe('onboarding-evolution', () => {
  it('seed é determinística', () => {
    expect(seedFromOnboardingAnswers(answers)).toBe(seedFromOnboardingAnswers(answers));
  });

  it('mapGoalToUserGoal converte ids legados', () => {
    expect(mapGoalToUserGoal('sono')).toBe('sono');
    expect(mapGoalToUserGoal('ansiedade')).toBe('ansiedade');
  });

  it('mapMoodToMascot converte escala 1-5', () => {
    expect(mapMoodToMascot('5')).toBe('empolgado');
    expect(mapMoodToMascot('1')).toBe('triste');
  });

  it('generateOnboardingPreview retorna DNA + firstWords', () => {
    const preview = generateOnboardingPreview(answers, 'Luna');
    expect(preview.seed).toBeGreaterThan(0);
    expect(preview.firstWords).toContain('Luna');
    expect(preview.rareTraitLabel.length).toBeGreaterThan(0);
    expect(preview.phenotype.displayModifiers).toBeDefined();
  });

  it('buildPersonalizationInput inclui stylePreset', () => {
    const input = buildPersonalizationInput(answers, 'Luna');
    expect(input.stylePreset).toBe('mystic');
    expect(input.bondType).toBe('espirito');
  });
});
