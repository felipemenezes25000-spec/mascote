/**
 * Grid de aliases e bounds do onboarding-flow.ts.
 *
 * Garante que cada nome de tela (canonical ou alias) retorna posição
 * 1..N coerente e label "Passo X de Y" sempre dentro do range.
 */

import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL,
  stepIndex,
  stepLabel,
} from '@/lib/onboarding-flow';

const CANONICAL: typeof ONBOARDING_STEPS[number][] = [...ONBOARDING_STEPS];
// 'hatch' e 'dna' são aliases em runtime mas não no tipo de stepLabel —
// testamos os tipados aqui; os outros são exercitados via cast em outro bloco.
const ALIASES = ['mood', 'meet', 'quiz', 'personality', 'identity', 'push'] as const;

describe('stepIndex — telas canonical', () => {
  it.each(CANONICAL)('canonical %s tem position entre 1 e total', name => {
    const idx = stepIndex(name);
    expect(idx).toBeGreaterThanOrEqual(1);
    expect(idx).toBeLessThanOrEqual(ONBOARDING_TOTAL);
  });

  it('positions são únicos para canonical steps', () => {
    const positions = CANONICAL.map(stepIndex);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it.each(CANONICAL.map((s, i) => [s, i + 1] as const))(
    'canonical %s tem position exata = %i',
    (name, expected) => {
      expect(stepIndex(name)).toBe(expected);
    },
  );
});

describe('stepIndex — aliases', () => {
  it.each(ALIASES)('alias %s tem position válida', alias => {
    const idx = stepIndex(alias);
    expect(idx).toBeGreaterThanOrEqual(1);
    expect(idx).toBeLessThanOrEqual(ONBOARDING_TOTAL);
  });

  const ALIAS_TO_CANONICAL: Array<[string, string]> = [
    ['mood', 'goal'],
    ['meet', 'mascot'],
    ['quiz', 'mascot'],
    ['personality', 'mascot'],
    ['identity', 'quick'],
    ['push', 'notice'],
  ];
  it.each(ALIAS_TO_CANONICAL)('alias %s mapeia para mesma position que %s', (alias, canonical) => {
    expect(stepIndex(alias as any)).toBe(stepIndex(canonical as any));
  });
});

describe('stepLabel — formato', () => {
  const ALL_NAMES = [...CANONICAL, ...ALIASES] as const;
  it.each(ALL_NAMES)('name=%s — label tem formato "Passo X de Y"', name => {
    const label = stepLabel(name as any);
    expect(label).toMatch(/^Passo \d+ de \d+$/);
  });

  it.each(ALL_NAMES)('name=%s — Y do label = ONBOARDING_TOTAL', name => {
    const label = stepLabel(name as any);
    const total = parseInt(label.split(' de ')[1], 10);
    expect(total).toBe(ONBOARDING_TOTAL);
  });

  it.each(ALL_NAMES)('name=%s — X do label = stepIndex(name)', name => {
    const label = stepLabel(name as any);
    const x = parseInt(label.split(' ')[1], 10);
    expect(x).toBe(stepIndex(name as any));
  });
});

describe('ONBOARDING_TOTAL', () => {
  it('é igual ao length de ONBOARDING_STEPS', () => {
    expect(ONBOARDING_TOTAL).toBe(ONBOARDING_STEPS.length);
  });

  it('é positivo', () => {
    expect(ONBOARDING_TOTAL).toBeGreaterThan(0);
  });
});

describe('robustness — nomes desconhecidos', () => {
  it('nome arbitrário retorna 0 (não quebra)', () => {
    expect(stepIndex('xyz' as any)).toBe(0);
  });

  it('string vazia retorna 0', () => {
    expect(stepIndex('' as any)).toBe(0);
  });

  it('label de nome desconhecido ainda é Passo X de Y formado', () => {
    expect(stepLabel('foo' as any)).toMatch(/^Passo \d+ de \d+$/);
  });
});
