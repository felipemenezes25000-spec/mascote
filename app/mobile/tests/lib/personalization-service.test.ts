import { describe, expect, it } from 'vitest';
import {
  personalizationFromOnboarding,
  storedToPartial,
} from '@/lib/personalization-service';
import type { OnboardingAnswers } from '@/lib/onboarding-evolution';

describe('personalization-service', () => {
  const answers: OnboardingAnswers = {
    goalId: 'sono',
    moodId: '4',
    stylePreset: 'vivid',
    bondType: 'guardiao',
    communicationTone: 'direto',
    pronoun: 'ela',
    primaryGoal: 'sono',
  };

  it('persiste estrutura completa a partir do onboarding', () => {
    const stored = personalizationFromOnboarding(answers, 'Luna', 'motivador');
    expect(stored.mascotName).toBe('Luna');
    expect(stored.bondType).toBe('guardiao');
    expect(stored.stylePreset).toBe('vivid');
    expect(stored.pronoun).toBe('ela');
    expect(stored.seed).toBeGreaterThan(0);
  });

  it('storedToPartial remove metadados', () => {
    const stored = personalizationFromOnboarding(answers, 'Luna');
    const partial = storedToPartial(stored);
    expect(partial?.bondType).toBe('guardiao');
    expect((partial as { pronoun?: string }).pronoun).toBeUndefined();
  });
});
