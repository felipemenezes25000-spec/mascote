/**
 * Lógica pura do Mundo dos Sonhos (dream-flow).
 *
 * Invariantes críticos:
 * - Janela de acerto centrada no PICO da expansão (metade do ciclo),
 *   com bordas inclusivas.
 * - Fora da janela (início/fim do ciclo) = erro, sem exceção.
 * - Tempo além de um ciclo é normalizado por módulo (toque entre o fim
 *   do ciclo e o reset do relógio não vira falso-negativo).
 * - NaN/negativo/zero nunca explodem: isHit → false, computeScore → 0.
 * - Score clamp 0..1; rounds=0 não divide por zero.
 */

import { describe, expect, it } from 'vitest';
import {
  computeScore,
  DREAM_CYCLE_MS,
  DREAM_HIT_WINDOW_FRACTION,
  DREAM_ROUNDS,
  isHit,
} from '@/game/minigames/dream-flow-logic';

// Ciclo de 3200ms com janela de 22% → janela de 704ms (±352ms) ao redor
// do pico em 1600ms: acerta em [1248, 1952], erra fora.
const CYCLE = 3200;
const FRACTION = 0.22;
const PEAK = CYCLE / 2; // 1600
const HALF_WINDOW = (FRACTION * CYCLE) / 2; // 352

describe('isHit — janela centrada no pico da expansão', () => {
  it('aceita toque exatamente no pico', () => {
    expect(isHit(PEAK, CYCLE, FRACTION)).toBe(true);
  });

  it('aceita dentro da janela, antes e depois do pico', () => {
    expect(isHit(PEAK - HALF_WINDOW + 1, CYCLE, FRACTION)).toBe(true);
    expect(isHit(PEAK + HALF_WINDOW - 1, CYCLE, FRACTION)).toBe(true);
  });

  it('bordas exatas da janela são inclusivas', () => {
    expect(isHit(PEAK - HALF_WINDOW, CYCLE, FRACTION)).toBe(true);
    expect(isHit(PEAK + HALF_WINDOW, CYCLE, FRACTION)).toBe(true);
  });

  it('rejeita 1ms fora da janela, dos dois lados', () => {
    expect(isHit(PEAK - HALF_WINDOW - 1, CYCLE, FRACTION)).toBe(false);
    expect(isHit(PEAK + HALF_WINDOW + 1, CYCLE, FRACTION)).toBe(false);
  });

  it('rejeita início e fim do ciclo (anel pequeno)', () => {
    expect(isHit(0, CYCLE, FRACTION)).toBe(false);
    expect(isHit(CYCLE - 1, CYCLE, FRACTION)).toBe(false);
  });

  it('normaliza tempo além de um ciclo por módulo', () => {
    // Toque que chegou depois do reset teórico do ciclo: ainda avalia certo.
    expect(isHit(CYCLE + PEAK, CYCLE, FRACTION)).toBe(true);
    expect(isHit(CYCLE + 10, CYCLE, FRACTION)).toBe(false);
    expect(isHit(3 * CYCLE + PEAK, CYCLE, FRACTION)).toBe(true);
  });

  it('defende NaN/Infinity/negativos sem explodir', () => {
    expect(isHit(NaN, CYCLE, FRACTION)).toBe(false);
    expect(isHit(Infinity, CYCLE, FRACTION)).toBe(false);
    expect(isHit(-5, CYCLE, FRACTION)).toBe(false);
    expect(isHit(PEAK, NaN, FRACTION)).toBe(false);
    expect(isHit(PEAK, 0, FRACTION)).toBe(false);
    expect(isHit(PEAK, -100, FRACTION)).toBe(false);
    expect(isHit(PEAK, CYCLE, NaN)).toBe(false);
    expect(isHit(PEAK, CYCLE, 0)).toBe(false);
    expect(isHit(PEAK, CYCLE, -0.5)).toBe(false);
  });

  it('windowFraction > 1 é clampado: ciclo inteiro vira acerto', () => {
    expect(isHit(0, CYCLE, 5)).toBe(true);
    expect(isHit(CYCLE - 1, CYCLE, 5)).toBe(true);
  });

  it('funciona com as constantes reais do jogo', () => {
    const peak = DREAM_CYCLE_MS / 2;
    expect(isHit(peak, DREAM_CYCLE_MS, DREAM_HIT_WINDOW_FRACTION)).toBe(true);
    expect(isHit(0, DREAM_CYCLE_MS, DREAM_HIT_WINDOW_FRACTION)).toBe(false);
    expect(isHit(DREAM_CYCLE_MS - 1, DREAM_CYCLE_MS, DREAM_HIT_WINDOW_FRACTION)).toBe(false);
  });
});

describe('computeScore — clamp e defesas', () => {
  it('hits/rounds básico', () => {
    expect(computeScore(0, 8)).toBe(0);
    expect(computeScore(4, 8)).toBe(0.5);
    expect(computeScore(8, 8)).toBe(1);
    expect(computeScore(DREAM_ROUNDS, DREAM_ROUNDS)).toBe(1);
  });

  it('clamp em 0..1 (hits além de rounds, hits negativos)', () => {
    expect(computeScore(12, 8)).toBe(1);
    expect(computeScore(-3, 8)).toBe(0);
  });

  it('defende rounds=0/negativo e NaN sem dividir por zero', () => {
    expect(computeScore(5, 0)).toBe(0);
    expect(computeScore(5, -8)).toBe(0);
    expect(computeScore(NaN, 8)).toBe(0);
    expect(computeScore(5, NaN)).toBe(0);
    expect(computeScore(Infinity, 8)).toBe(0);
  });
});
