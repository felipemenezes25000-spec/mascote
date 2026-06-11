/**
 * Testes para `limitedEvents` (scarcity ético).
 *
 * Pontos chave:
 * - "weekend-double-xp" deve cobrir sábado E domingo.
 * - "tonight-coins-x3" deve estar ativo entre 19h e 23h locais.
 * - `timeRemaining` é não-negativo.
 */

import { describe, expect, it, vi } from 'vitest';
import { activeEventBoost, activeLimitedEvent, limitedEvents, timeRemaining } from '@/lib/events';

function fakeNow(year: number, month: number, day: number, h = 12, m = 0): Date {
  return new Date(year, month - 1, day, h, m, 0, 0);
}

describe('limitedEvents', () => {
  it('export list contém os 2 eventos canônicos', () => {
    expect(limitedEvents.map(e => e.id)).toEqual([
      'weekend-double-xp',
      'tonight-coins-x3',
    ]);
  });

  describe('weekend-double-xp', () => {
    it('ativo em um sábado às 12h', () => {
      // 2026-05-16 = sábado
      vi.useFakeTimers();
      vi.setSystemTime(fakeNow(2026, 5, 16, 12));
      const ev = activeLimitedEvent();
      expect(ev?.id).toBe('weekend-double-xp');
      vi.useRealTimers();
    });

    it('ativo em um domingo às 14h', () => {
      // 2026-05-17 = domingo
      vi.useFakeTimers();
      vi.setSystemTime(fakeNow(2026, 5, 17, 14));
      const ev = activeLimitedEvent();
      expect(ev?.id).toBe('weekend-double-xp');
      vi.useRealTimers();
    });

    it('NÃO ativo numa quarta às 12h', () => {
      // 2026-05-13 = quarta
      vi.useFakeTimers();
      vi.setSystemTime(fakeNow(2026, 5, 13, 12));
      const ev = activeLimitedEvent();
      // Pode ser tonight-coins-x3 ativo nesse horário? não, 12h < 19h.
      expect(ev).toBeNull();
      vi.useRealTimers();
    });

    it('multiplier é 2', () => {
      const w = limitedEvents.find(e => e.id === 'weekend-double-xp')!;
      expect(w.multiplier).toBe(2);
    });
  });

  describe('tonight-coins-x3', () => {
    it('ativo às 20h (segunda)', () => {
      // 2026-05-18 = segunda
      vi.useFakeTimers();
      vi.setSystemTime(fakeNow(2026, 5, 18, 20));
      const ev = activeLimitedEvent();
      expect(ev?.id).toBe('tonight-coins-x3');
      vi.useRealTimers();
    });

    it('NÃO ativo às 18:59', () => {
      vi.useFakeTimers();
      vi.setSystemTime(fakeNow(2026, 5, 18, 18, 59));
      const ev = activeLimitedEvent();
      expect(ev).toBeNull();
      vi.useRealTimers();
    });

    it('multiplier é 3', () => {
      const t = limitedEvents.find(e => e.id === 'tonight-coins-x3')!;
      expect(t.multiplier).toBe(3);
    });
  });

  describe('activeEventBoost (regressão 2026-06-11 — multiplicador agora atinge a economia)', () => {
    it('weekend → xpMult 2, coinMult 1 (evento de XP)', () => {
      // 2026-05-16 = sábado 12h
      const boost = activeEventBoost(fakeNow(2026, 5, 16, 12));
      expect(boost).toEqual({ xpMult: 2, coinMult: 1 });
    });

    it('noite (20h) → coinMult 3, xpMult 1 (evento de moedas)', () => {
      // 2026-05-18 = segunda 20h
      const boost = activeEventBoost(fakeNow(2026, 5, 18, 20));
      expect(boost).toEqual({ xpMult: 1, coinMult: 3 });
    });

    it('sem evento ativo → tudo 1× (no-op)', () => {
      // 2026-05-13 = quarta 12h (fora de qualquer janela)
      const boost = activeEventBoost(fakeNow(2026, 5, 13, 12));
      expect(boost).toEqual({ xpMult: 1, coinMult: 1 });
    });

    it('cada evento canônico declara appliesTo', () => {
      for (const ev of limitedEvents) {
        expect(['xp', 'coins']).toContain(ev.appliesTo);
      }
    });
  });

  describe('timeRemaining', () => {
    it('retorna {0,0,0} quando end já passou', () => {
      const now = fakeNow(2026, 5, 18, 12);
      const past = fakeNow(2026, 5, 17, 12);
      const r = timeRemaining(past, now);
      expect(r).toEqual({ hours: 0, minutes: 0, total_ms: 0 });
    });

    it('retorna horas e minutos corretos', () => {
      const now = fakeNow(2026, 5, 18, 10, 0);
      const end = fakeNow(2026, 5, 18, 12, 30);
      const r = timeRemaining(end, now);
      expect(r.hours).toBe(2);
      expect(r.minutes).toBe(30);
      expect(r.total_ms).toBe(2 * 3600_000 + 30 * 60_000);
    });

    it('usa Date.now() default quando `now` omitido', () => {
      vi.useFakeTimers();
      vi.setSystemTime(fakeNow(2026, 5, 18, 10, 0));
      const end = fakeNow(2026, 5, 18, 11, 0);
      const r = timeRemaining(end);
      expect(r.hours).toBe(1);
      expect(r.minutes).toBe(0);
      vi.useRealTimers();
    });
  });

  describe('weekend boundary edge cases', () => {
    it('sexta-feira 23:59 NÃO está em weekend', () => {
      vi.useFakeTimers();
      // 2026-05-15 = sexta
      vi.setSystemTime(fakeNow(2026, 5, 15, 23, 59));
      const ev = activeLimitedEvent();
      // Pode haver tonight-coins-x3 ativo (19-23). Às 23:59, fora.
      expect(ev).toBeNull();
      vi.useRealTimers();
    });

    it('domingo 23:59:59 ainda está em weekend', () => {
      vi.useFakeTimers();
      vi.setSystemTime(fakeNow(2026, 5, 17, 23, 59));
      const ev = activeLimitedEvent();
      expect(ev?.id).toBe('weekend-double-xp');
      vi.useRealTimers();
    });
  });
});
