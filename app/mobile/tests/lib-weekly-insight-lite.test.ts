/**
 * Testes do insight semanal grátis — V2 paywall ético.
 *
 * Cada nivel de atividade produz uma frase distinta. Sem culpa em todas.
 */
import { describe, expect, it } from 'vitest';
import { buildWeeklyInsightLite } from '@/lib/weekly-insight-lite';

const NO_GUILT = /falha|cobr|culpa|abandon|punição|deve|errou|fracass/i;

describe('buildWeeklyInsightLite', () => {
  it('semana zero retorna mensagem sobre começo', () => {
    const r = buildWeeklyInsightLite(0, 0, 0);
    expect(r).toMatch(/check-ins|começar|aparecer/i);
  });

  it('weekCheckins >= 5 celebra presença', () => {
    const r = buildWeeklyInsightLite(7, 2, 3);
    expect(r).toMatch(/7/);
    expect(r).toMatch(/presença/i);
  });

  it('habitVariety >= 4 celebra variedade', () => {
    const r = buildWeeklyInsightLite(4, 4, 0);
    expect(r).toMatch(/4/);
    expect(r).toMatch(/variedade|tipos/i);
  });

  it('streak >= 3 celebra streak', () => {
    const r = buildWeeklyInsightLite(2, 1, 5);
    expect(r).toMatch(/5/);
    expect(r).toMatch(/fogo|seguimos|dias/i);
  });

  it.each([
    [0, 0, 0],
    [1, 1, 0],
    [3, 2, 2],
    [5, 3, 5],
    [10, 5, 7],
    [20, 9, 30],
  ])('combo (%i checkins, %i variety, %i streak) — sem culpa', (c, v, s) => {
    const r = buildWeeklyInsightLite(c, v, s);
    expect(r).not.toMatch(NO_GUILT);
  });

  it.each([1, 2, 3, 4, 5, 10, 20])(
    'weekCheckins=%i — sempre retorna string não-vazia',
    n => {
      const r = buildWeeklyInsightLite(n, 1, 0);
      expect(r.length).toBeGreaterThan(0);
    },
  );

  it('determinístico — mesmos inputs = mesmo output', () => {
    const a = buildWeeklyInsightLite(7, 4, 3);
    const b = buildWeeklyInsightLite(7, 4, 3);
    expect(a).toBe(b);
  });

  it.each([
    [NaN, 0, 0],
    [Infinity, 0, 0],
    [-1, -1, -1],
  ])('valores estranhos (%s, %s, %s) não quebram', (c, v, s) => {
    expect(() => buildWeeklyInsightLite(c, v, s)).not.toThrow();
  });
});
