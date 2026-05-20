/**
 * Testes do gerador do Diário do Mascote.
 *
 * Garantias críticas que NÃO podem regredir:
 * - Tom sem culpa: retorno após ausência NUNCA cita "abandono" ou similar.
 * - 1ª pessoa: entries em "eu/me", não "o usuário".
 * - Determinismo: mesmas entradas + mesmas datas = mesmo resultado.
 */

import { describe, expect, it } from 'vitest';
import {
  detectReturnAfterAbsence,
  detectStreakMilestones,
} from '@/lib/diary/mascotDiary';
import type { Checkin } from '@/types';

function makeCheckin(id: string, occurred_on: string, occurred_at?: string): Checkin {
  return {
    id,
    user_id: 'u1',
    habit_kind: 'water',
    value: 1,
    unit: null,
    occurred_on,
    occurred_at: occurred_at ?? `${occurred_on}T10:00:00.000Z`,
    xp_awarded: 10,
    idempotency_key: `idem-${id}`,
    created_at: occurred_at ?? `${occurred_on}T10:00:00.000Z`,
  };
}

describe('detectReturnAfterAbsence', () => {
  it('retorna vazio com menos de 2 check-ins', () => {
    expect(detectReturnAfterAbsence([], 'Bipo')).toEqual([]);
    expect(detectReturnAfterAbsence([makeCheckin('a', '2026-05-01')], 'Bipo')).toEqual([]);
  });

  it('NÃO gera entrada para gap < 3 dias', () => {
    const list = [
      makeCheckin('a', '2026-05-01'),
      makeCheckin('b', '2026-05-03'),
    ];
    expect(detectReturnAfterAbsence(list, 'Bipo')).toEqual([]);
  });

  it('gera entrada para gap >= 3 dias', () => {
    const list = [
      makeCheckin('a', '2026-05-01'),
      makeCheckin('b', '2026-05-05'),
    ];
    const out = detectReturnAfterAbsence(list, 'Bipo');
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('return_after_absence');
    expect(out[0].hint).toMatch(/\d+ dias/);
  });

  it('tom sem culpa — nunca usa "abandono", "cobrar", "punição"', () => {
    const list = [
      makeCheckin('a', '2026-05-01'),
      makeCheckin('b', '2026-05-15'),
    ];
    const [entry] = detectReturnAfterAbsence(list, 'Bipo', 'Felipe');
    expect(entry.body).not.toMatch(/abandon|cobr|culp|punição|culpa/i);
  });

  it('respeita displayName quando fornecido', () => {
    const list = [
      makeCheckin('a', '2026-05-01'),
      makeCheckin('b', '2026-05-10'),
    ];
    const [entry] = detectReturnAfterAbsence(list, 'Bipo', 'Felipe');
    expect(entry.body).toContain('Felipe');
  });
});

describe('detectStreakMilestones', () => {
  it('vazio sem check-ins', () => {
    expect(detectStreakMilestones([], 'Bipo')).toEqual([]);
  });

  it('detecta marco de 7 dias seguidos', () => {
    const list: Checkin[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date('2026-05-01T10:00:00.000Z');
      d.setUTCDate(d.getUTCDate() + i);
      list.push(makeCheckin(`c${i}`, d.toISOString().slice(0, 10), d.toISOString()));
    }
    const out = detectStreakMilestones(list, 'Bipo');
    const ms = out.find(e => e.hint?.startsWith('7 '));
    expect(ms).toBeDefined();
    expect(ms?.kind).toBe('streak_milestone');
  });

  it('cada marco aparece uma única vez mesmo com streak maior', () => {
    // 14 dias seguidos: deve gerar marco de 7 E de 14 (mas só um de cada).
    const list: Checkin[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date('2026-05-01T10:00:00.000Z');
      d.setUTCDate(d.getUTCDate() + i);
      list.push(makeCheckin(`c${i}`, d.toISOString().slice(0, 10), d.toISOString()));
    }
    const out = detectStreakMilestones(list, 'Bipo');
    const sevens = out.filter(e => e.hint === '7 dias seguidos');
    const fourteens = out.filter(e => e.hint === '14 dias seguidos');
    expect(sevens).toHaveLength(1);
    expect(fourteens).toHaveLength(1);
  });

  it('streak quebrada NÃO conta marco', () => {
    const list: Checkin[] = [
      makeCheckin('a', '2026-05-01'),
      makeCheckin('b', '2026-05-02'),
      makeCheckin('c', '2026-05-03'),
      // gap
      makeCheckin('d', '2026-05-10'),
      makeCheckin('e', '2026-05-11'),
    ];
    const out = detectStreakMilestones(list, 'Bipo');
    expect(out).toEqual([]);
  });

  it('texto do marco usa displayName e não cita culpa', () => {
    const list: Checkin[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date('2026-05-01T10:00:00.000Z');
      d.setUTCDate(d.getUTCDate() + i);
      list.push(makeCheckin(`c${i}`, d.toISOString().slice(0, 10), d.toISOString()));
    }
    const out = detectStreakMilestones(list, 'Bipo', 'Felipe');
    for (const e of out) {
      expect(e.body).toContain('Felipe');
      expect(e.body).not.toMatch(/perd|falh|cobr/i);
    }
  });
});
