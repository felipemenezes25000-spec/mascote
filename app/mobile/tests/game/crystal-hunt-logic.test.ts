/**
 * Caça aos Cristais — lógica pura.
 *
 * Invariantes críticos:
 * - Deck é função PURA da seed: mesma seed → mesma ordem (determinismo).
 * - Sempre 12 cartas com exatamente 6 pares, só cristais do catálogo.
 * - Score: 1.0 com ≤6 movimentos, 0 com ≥24, linear no meio, monotônico.
 * - Entrada corrompida (NaN/Infinity/negativo) nunca vira poison nem exploit.
 */

import { describe, expect, it } from 'vitest';
import {
  buildDeck,
  computeScore,
  CRYSTAL_EMOJIS,
  FLOOR_MOVES,
  PERFECT_MOVES,
  TOTAL_PAIRS,
} from '@/game/minigames/crystal-hunt-logic';

describe('buildDeck — determinismo e estrutura', () => {
  it('mesma seed → exatamente o mesmo deck', () => {
    expect(buildDeck(42)).toEqual(buildDeck(42));
    expect(buildDeck(0)).toEqual(buildDeck(0));
    expect(buildDeck(-7)).toEqual(buildDeck(-7));
  });

  it('seeds diferentes produzem ordens diferentes (na prática)', () => {
    // Não é garantia matemática pra TODO par de seeds, mas entre 10 seeds
    // consecutivas ao menos uma permutação deve divergir — senão o shuffle
    // está quebrado (ex.: rng ignorada).
    const base = buildDeck(1).join('');
    const anyDifferent = [2, 3, 4, 5, 6, 7, 8, 9, 10].some(
      s => buildDeck(s).join('') !== base,
    );
    expect(anyDifferent).toBe(true);
  });

  it('tem 12 cartas com exatamente 6 pares, só cristais do catálogo', () => {
    for (const seed of [0, 1, 999, 123456789]) {
      const deck = buildDeck(seed);
      expect(deck.length).toBe(TOTAL_PAIRS * 2);
      const counts = new Map<string, number>();
      for (const c of deck) counts.set(c, (counts.get(c) ?? 0) + 1);
      expect(counts.size).toBe(TOTAL_PAIRS);
      for (const emoji of CRYSTAL_EMOJIS) expect(counts.get(emoji)).toBe(2);
    }
  });

  it('seed NaN/Infinity não explode e ainda gera deck válido', () => {
    for (const seed of [NaN, Infinity, -Infinity]) {
      const deck = buildDeck(seed);
      expect(deck.length).toBe(12);
      expect(new Set(deck).size).toBe(TOTAL_PAIRS);
    }
    // mulberry32 normaliza não-finito pra 0 → mesmo deck da seed 0.
    expect(buildDeck(NaN)).toEqual(buildDeck(0));
  });
});

describe('computeScore — curva 6→24 movimentos', () => {
  it('jogo perfeito (≤6 movimentos) → 1.0', () => {
    expect(computeScore(PERFECT_MOVES)).toBe(1);
    expect(computeScore(6)).toBe(1);
    // Menos que 6 é impossível no jogo real, mas a função não pune.
    expect(computeScore(0)).toBe(1);
  });

  it('≥24 movimentos → piso 0', () => {
    expect(computeScore(FLOOR_MOVES)).toBe(0);
    expect(computeScore(24)).toBe(0);
    expect(computeScore(100)).toBe(0);
  });

  it('meio do caminho é linear (15 movimentos → 0.5)', () => {
    expect(computeScore(15)).toBeCloseTo(0.5, 10);
    expect(computeScore(7)).toBeCloseTo(17 / 18, 10);
    expect(computeScore(23)).toBeCloseTo(1 / 18, 10);
  });

  it('é monotônico não-crescente e sempre dentro de [0, 1]', () => {
    let prev = 1;
    for (let m = 0; m <= 40; m++) {
      const s = computeScore(m);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(prev);
      prev = s;
    }
  });

  it('NaN/Infinity/negativo → 0 (sem poison, sem exploit)', () => {
    expect(computeScore(NaN)).toBe(0);
    expect(computeScore(Infinity)).toBe(0);
    expect(computeScore(-1)).toBe(0);
    expect(computeScore(-0.5)).toBe(0);
  });
});
