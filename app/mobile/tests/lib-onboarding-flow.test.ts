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

  it('stepIndex retorna posições 1-based para steps conhecidos', () => {
    expect(stepIndex('age')).toBe(1);
    expect(stepIndex('goal')).toBe(2);
    expect(stepIndex('mood')).toBe(3);
    expect(stepIndex('mascot')).toBe(4);
    expect(stepIndex('personality')).toBe(5);
    expect(stepIndex('name')).toBe(6);
    expect(stepIndex('push')).toBe(7);
  });

  it('quiz mapeia para a mesma posição de personality', () => {
    expect(stepIndex('quiz')).toBe(stepIndex('personality'));
  });

  it('stepLabel formata como "Passo X de Y"', () => {
    expect(stepLabel('age')).toBe(`Passo 1 de ${ONBOARDING_TOTAL}`);
    expect(stepLabel('name')).toBe(`Passo 6 de ${ONBOARDING_TOTAL}`);
    expect(stepLabel('push')).toBe(`Passo 7 de ${ONBOARDING_TOTAL}`);
  });

  it('stepIndex retorna 0 para entrada desconhecida', () => {
    // @ts-expect-error — força entrada inválida pra cobrir branch
    expect(stepIndex('does-not-exist')).toBe(0);
  });

  it('quiz e personality têm label idêntico', () => {
    expect(stepLabel('quiz')).toBe(stepLabel('personality'));
  });
});
