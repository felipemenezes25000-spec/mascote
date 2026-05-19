import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL,
  stepIndex,
  stepLabel,
} from '@/lib/onboarding-flow';

describe('onboarding-flow', () => {
  it('total reflete o tamanho do array', () => {
    expect(ONBOARDING_TOTAL).toBe(ONBOARDING_STEPS.length);
  });

  it('total é 5 após redução 11→6 telas (incluindo welcome)', () => {
    expect(ONBOARDING_TOTAL).toBe(5);
  });

  it('stepIndex retorna posições 1-based para steps canônicos', () => {
    expect(stepIndex('age')).toBe(1);
    expect(stepIndex('goal')).toBe(2);
    expect(stepIndex('mascot')).toBe(3);
    expect(stepIndex('name')).toBe(4);
    expect(stepIndex('notice')).toBe(5);
  });

  it('mood compartilha posição com goal (telas fundidas)', () => {
    expect(stepIndex('mood')).toBe(stepIndex('goal'));
  });

  it('meet compartilha posição com mascot (telas fundidas)', () => {
    expect(stepIndex('meet')).toBe(stepIndex('mascot'));
  });

  it('push compartilha posição com notice (telas fundidas)', () => {
    expect(stepIndex('push')).toBe(stepIndex('notice'));
  });

  it('quiz e personality são alt-paths de mascot', () => {
    expect(stepIndex('quiz')).toBe(stepIndex('mascot'));
    expect(stepIndex('personality')).toBe(stepIndex('mascot'));
  });

  it('stepLabel formata como "Passo X de Y"', () => {
    expect(stepLabel('age')).toBe(`Passo 1 de ${ONBOARDING_TOTAL}`);
    expect(stepLabel('name')).toBe(`Passo 4 de ${ONBOARDING_TOTAL}`);
    expect(stepLabel('notice')).toBe(`Passo 5 de ${ONBOARDING_TOTAL}`);
  });

  it('stepIndex retorna 0 para entrada desconhecida', () => {
    // @ts-expect-error — força entrada inválida pra cobrir branch
    expect(stepIndex('does-not-exist')).toBe(0);
  });

  it('quiz e personality têm label idêntico (ambos alt de mascot)', () => {
    expect(stepLabel('quiz')).toBe(stepLabel('personality'));
    expect(stepLabel('mood')).toBe(stepLabel('goal'));
    expect(stepLabel('push')).toBe(stepLabel('notice'));
  });
});
