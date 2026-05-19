/**
 * Eventos sazonais — quando acontecem, mensagens, emojis.
 *
 * Cuidado especial com `ano-novo` que crossa o ano (30/12 → 02/01).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activeSeasonalEvent, isLateNight, seasonalEvents } from '@/content/seasonal';

function fakeNow(year: number, month: number, day: number, h = 12): Date {
  return new Date(year, month - 1, day, h, 0, 0, 0);
}

describe('seasonalEvents', () => {
  it('contém 8 eventos canônicos', () => {
    expect(seasonalEvents.length).toBe(8);
  });

  it('ids únicos', () => {
    const ids = seasonalEvents.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todos têm name, emoji e message', () => {
    for (const e of seasonalEvents) {
      expect(e.name.length).toBeGreaterThan(0);
      expect(e.emoji.length).toBeGreaterThan(0);
      expect(e.message.length).toBeGreaterThan(0);
    }
  });

  it('months estão em [1..12]', () => {
    for (const e of seasonalEvents) {
      expect(e.startMonth).toBeGreaterThanOrEqual(1);
      expect(e.startMonth).toBeLessThanOrEqual(12);
      expect(e.endMonth).toBeGreaterThanOrEqual(1);
      expect(e.endMonth).toBeLessThanOrEqual(12);
    }
  });

  it('days estão em [1..31]', () => {
    for (const e of seasonalEvents) {
      expect(e.startDay).toBeGreaterThanOrEqual(1);
      expect(e.startDay).toBeLessThanOrEqual(31);
      expect(e.endDay).toBeGreaterThanOrEqual(1);
      expect(e.endDay).toBeLessThanOrEqual(31);
    }
  });
});

describe('activeSeasonalEvent — windows lineares', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('15/04 → outono-leve', () => {
    expect(activeSeasonalEvent(fakeNow(2026, 4, 15))?.id).toBe('outono-leve');
  });

  it('25/12 → natal', () => {
    expect(activeSeasonalEvent(fakeNow(2026, 12, 25))?.id).toBe('natal');
  });

  it('15/06 → festa-junina', () => {
    expect(activeSeasonalEvent(fakeNow(2026, 6, 15))?.id).toBe('festa-junina');
  });

  it('01/05 → outono-leve (último dia)', () => {
    expect(activeSeasonalEvent(fakeNow(2026, 5, 15))?.id).toBe('outono-leve');
  });

  it('16/05 → fora de qualquer janela', () => {
    expect(activeSeasonalEvent(fakeNow(2026, 5, 16))).toBeNull();
  });

  it('01/03 → null (fora de carnaval)', () => {
    expect(activeSeasonalEvent(fakeNow(2026, 3, 1))).toBeNull();
  });
});

describe('activeSeasonalEvent — crossover ano (ano-novo: 30/12 → 02/01)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('30/12 → ano-novo', () => {
    expect(activeSeasonalEvent(fakeNow(2026, 12, 30))?.id).toBe('ano-novo');
  });
  it('31/12 → ano-novo', () => {
    expect(activeSeasonalEvent(fakeNow(2026, 12, 31))?.id).toBe('ano-novo');
  });
  it('01/01 → ano-novo', () => {
    expect(activeSeasonalEvent(fakeNow(2026, 1, 1))?.id).toBe('ano-novo');
  });
  it('02/01 → ano-novo (último dia)', () => {
    expect(activeSeasonalEvent(fakeNow(2026, 1, 2))?.id).toBe('ano-novo');
  });
  it('03/01 → fora', () => {
    expect(activeSeasonalEvent(fakeNow(2026, 1, 3))).toBeNull();
  });
  it('29/12 → fora (carnaval ainda longe, antes do ano-novo)', () => {
    expect(activeSeasonalEvent(fakeNow(2026, 12, 29))?.id).not.toBe('ano-novo');
  });
});

describe('activeSeasonalEvent — boundary edge cases', () => {
  it('day antes do startDay no startMonth → fora', () => {
    // outono-leve = 01/04 → 15/05. Dia 31/03 está fora.
    expect(activeSeasonalEvent(fakeNow(2026, 3, 31))).toBeNull();
  });
  it('day depois do endDay no endMonth → fora', () => {
    // outono-leve termina 15/05. Dia 16/05 está fora.
    expect(activeSeasonalEvent(fakeNow(2026, 5, 16))).toBeNull();
  });
});

describe('isLateNight', () => {
  it('01:00 → true', () => {
    expect(isLateNight(new Date(2026, 0, 1, 1, 0))).toBe(true);
  });
  it('04:59 → true', () => {
    expect(isLateNight(new Date(2026, 0, 1, 4, 59))).toBe(true);
  });
  it('00:30 → false (antes da 1h)', () => {
    expect(isLateNight(new Date(2026, 0, 1, 0, 30))).toBe(false);
  });
  it('05:00 → false (limite superior)', () => {
    expect(isLateNight(new Date(2026, 0, 1, 5, 0))).toBe(false);
  });
  it('12:00 → false', () => {
    expect(isLateNight(new Date(2026, 0, 1, 12, 0))).toBe(false);
  });
  it('com default Date.now()', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 3, 0));
    expect(isLateNight()).toBe(true);
    vi.useRealTimers();
  });
});
