/**
 * Corrida de Energia — lógica pura do cronograma de spawn e do score.
 *
 * Invariantes críticos:
 * - Cronograma é determinístico por seed (mulberry32); seed NaN não envenena.
 * - Proporção de itens bons GARANTIDA (>= 60%), não probabilística.
 * - Posições em fração [0,1]; todo item nasce e some DENTRO dos 30s.
 * - Score clampa em [0,1] e defende NaN/divisão por zero.
 */

import { describe, expect, it } from 'vitest';
import {
  buildSpawnSchedule,
  computeScore,
  GOOD_COUNT,
  ITEM_LIFE_MS,
  ROUND_MS,
  SPAWN_COUNT,
} from '@/game/minigames/energy-run-logic';

describe('buildSpawnSchedule — determinismo', () => {
  it('mesma seed → cronograma idêntico', () => {
    expect(buildSpawnSchedule(42)).toEqual(buildSpawnSchedule(42));
    expect(buildSpawnSchedule(2026)).toEqual(buildSpawnSchedule(2026));
  });

  it('seeds diferentes → cronogramas diferentes', () => {
    const a = JSON.stringify(buildSpawnSchedule(1));
    const b = JSON.stringify(buildSpawnSchedule(2));
    expect(a).not.toBe(b);
  });

  it('seed NaN/Infinity não quebra e equivale a seed 0 (regra do mulberry32)', () => {
    expect(buildSpawnSchedule(NaN)).toEqual(buildSpawnSchedule(0));
    expect(buildSpawnSchedule(Infinity)).toEqual(buildSpawnSchedule(0));
    expect(buildSpawnSchedule(NaN).length).toBe(SPAWN_COUNT);
  });
});

describe('buildSpawnSchedule — estrutura da partida', () => {
  it(`gera exatamente ${SPAWN_COUNT} itens com ids únicos`, () => {
    const schedule = buildSpawnSchedule(7);
    expect(schedule.length).toBe(SPAWN_COUNT);
    expect(new Set(schedule.map(i => i.id)).size).toBe(SPAWN_COUNT);
  });

  it('proporção de bons é garantida (>= 60%) em qualquer seed', () => {
    for (let seed = 0; seed < 50; seed++) {
      const schedule = buildSpawnSchedule(seed);
      const good = schedule.filter(i => i.good).length;
      expect(good).toBe(GOOD_COUNT);
      expect(good / schedule.length).toBeGreaterThanOrEqual(0.6);
    }
  });

  it('posições x/y sempre em fração [0,1]', () => {
    for (const seed of [0, 13, 999, 123456]) {
      for (const item of buildSpawnSchedule(seed)) {
        expect(item.x).toBeGreaterThanOrEqual(0);
        expect(item.x).toBeLessThanOrEqual(1);
        expect(item.y).toBeGreaterThanOrEqual(0);
        expect(item.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('todo item nasce em ordem e some antes do fim dos 30s', () => {
    for (const seed of [0, 5, 77, 31337]) {
      const schedule = buildSpawnSchedule(seed);
      let prev = -1;
      for (const item of schedule) {
        expect(item.atMs).toBeGreaterThan(prev);
        expect(item.lifeMs).toBe(ITEM_LIFE_MS);
        expect(item.atMs + item.lifeMs).toBeLessThanOrEqual(ROUND_MS);
        prev = item.atMs;
      }
    }
  });

  it('bons e ruins têm emoji e kind coerentes', () => {
    const schedule = buildSpawnSchedule(11);
    for (const item of schedule) {
      expect(item.emoji.length).toBeGreaterThan(0);
      if (item.good) {
        expect(['gota', 'estrela', 'fruta', 'energia']).toContain(item.kind);
      } else {
        expect(['desanimo', 'cansaco']).toContain(item.kind);
      }
    }
  });
});

describe('computeScore — clamp e defesa', () => {
  it('caso normal: fração coletada', () => {
    expect(computeScore(0, 17)).toBe(0);
    expect(computeScore(8, 16)).toBe(0.5);
    expect(computeScore(17, 17)).toBe(1);
  });

  it('clampa em [0,1] (coletado > total e negativos)', () => {
    expect(computeScore(20, 17)).toBe(1);
    expect(computeScore(-3, 17)).toBe(0);
  });

  it('total 0 ou negativo → 0 (sem divisão por zero)', () => {
    expect(computeScore(5, 0)).toBe(0);
    expect(computeScore(5, -1)).toBe(0);
  });

  it('NaN/Infinity → 0 (sem poison)', () => {
    expect(computeScore(NaN, 17)).toBe(0);
    expect(computeScore(5, NaN)).toBe(0);
    expect(computeScore(Infinity, 17)).toBe(0);
    expect(computeScore(5, Infinity)).toBe(0);
  });
});
