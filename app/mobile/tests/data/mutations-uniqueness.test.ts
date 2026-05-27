/**
 * Garantia de unicidade do catálogo expandido de mutações (auditoria
 * 2026-05-27 task 3.1).
 *
 * Antes desta migração, várias mutações compartilhavam descrições
 * interpoladas ("${days} dias seguidos juntos — o corpo dele guarda essa
 * constância" e "Genes em harmonia — uma forma nova emergiu, só sua.")
 * fazendo o catálogo aparecer com 50+ entradas mas só 5-6 textos distintos
 * pra usuário. Esta suite trava regressão: cada nome e cada description
 * devem ser únicos no escopo combinado de TIME + STREAK + EMOTIONAL + RARE.
 */

import { describe, expect, test } from 'vitest';
import {
  TIME_MUTATIONS,
  STREAK_MUTATIONS,
  EMOTIONAL_MUTATIONS,
  RARE_MUTATIONS,
} from '@/lib/dna/mutations-extended';

test('all mutation descriptions are unique', () => {
  const all = [
    ...TIME_MUTATIONS,
    ...STREAK_MUTATIONS,
    ...EMOTIONAL_MUTATIONS,
    ...RARE_MUTATIONS,
  ];
  const descriptions = all.map((m) => m.description);
  expect(new Set(descriptions).size).toBe(descriptions.length);
});

test('all mutation names are unique', () => {
  const all = [
    ...TIME_MUTATIONS,
    ...STREAK_MUTATIONS,
    ...EMOTIONAL_MUTATIONS,
    ...RARE_MUTATIONS,
  ];
  const names = all.map((m) => m.name);
  expect(new Set(names).size).toBe(names.length);
});

test('catalog has at least 45 entries', () => {
  const all = [
    ...TIME_MUTATIONS,
    ...STREAK_MUTATIONS,
    ...EMOTIONAL_MUTATIONS,
    ...RARE_MUTATIONS,
  ];
  expect(all.length).toBeGreaterThanOrEqual(45);
});

describe('per-category sanity', () => {
  test('TIME_MUTATIONS has 15 entries (1d → 500d milestones)', () => {
    expect(TIME_MUTATIONS.length).toBe(15);
  });

  test('STREAK_MUTATIONS has at least 10 entries', () => {
    expect(STREAK_MUTATIONS.length).toBeGreaterThanOrEqual(10);
  });

  test('EMOTIONAL_MUTATIONS has at least 10 entries', () => {
    expect(EMOTIONAL_MUTATIONS.length).toBeGreaterThanOrEqual(10);
  });

  test('RARE_MUTATIONS has at least 10 entries', () => {
    expect(RARE_MUTATIONS.length).toBeGreaterThanOrEqual(10);
  });
});
