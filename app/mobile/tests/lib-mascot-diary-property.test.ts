/**
 * Property tests do gerador de diário do mascote.
 *
 * Invariantes críticos validados sob centenas de inputs gerados:
 *  - Tom sem culpa SEMPRE (em qualquer combinação de check-ins/datas).
 *  - 1ª pessoa do mascote (usa nomes corretos).
 *  - Retorno após ausência só dispara para gaps >= 3 dias.
 *  - Marco de streak nunca dispara para sequências interrompidas.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  detectReturnAfterAbsence,
  detectStreakMilestones,
} from '@/lib/diary/mascotDiary';
import type { Checkin } from '@/types';

function mkCheckin(id: string, occurred_on: string, occurred_at?: string): Checkin {
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

const GUILT_WORDS = /abandon|cobr|culp|punição|punicao|falh[ae]i|deve|errou|errei|fracass/i;
// Sem 'Você' aqui — esse caso usa fluxo especial (eu não te vejo / você voltou)
// que NÃO inclui a string "Você" literal no body. Testamos esse path separado.
const NAMES = ['Felipe', 'Renato', 'Maria', 'João', 'Lara'];

describe('PROPERTY: detectReturnAfterAbsence tom sem culpa', () => {
  it('para qualquer (gap >= 3 dias, displayName): NUNCA usa vocabulário de culpa', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 365 }),
        fc.constantFrom(...NAMES),
        (gapDays, name) => {
          const base = new Date('2026-01-01T10:00:00.000Z');
          const later = new Date(base.getTime() + gapDays * 86_400_000);
          const list: Checkin[] = [
            mkCheckin('a', base.toISOString().slice(0, 10), base.toISOString()),
            mkCheckin('b', later.toISOString().slice(0, 10), later.toISOString()),
          ];
          const entries = detectReturnAfterAbsence(list, 'Bipo', name);
          return entries.length === 1 && !GUILT_WORDS.test(entries[0].body);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('PROPERTY: detectReturnAfterAbsence só dispara para gap >= 3', () => {
  it('gap entre 0 e 2 nunca gera entrada', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 }), gapDays => {
        const base = new Date('2026-01-01T10:00:00.000Z');
        const later = new Date(base.getTime() + gapDays * 86_400_000);
        const list: Checkin[] = [
          mkCheckin('a', base.toISOString().slice(0, 10), base.toISOString()),
          mkCheckin('b', later.toISOString().slice(0, 10), later.toISOString()),
        ];
        return detectReturnAfterAbsence(list, 'Bipo').length === 0;
      }),
      { numRuns: 50 },
    );
  });
});

describe('PROPERTY: entry.body contém o nome do usuário', () => {
  it.each(NAMES)('displayName=%s aparece no body do entry', name => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 60 }), gapDays => {
        const base = new Date('2026-01-01T10:00:00.000Z');
        const later = new Date(base.getTime() + gapDays * 86_400_000);
        const list: Checkin[] = [
          mkCheckin('a', base.toISOString().slice(0, 10), base.toISOString()),
          mkCheckin('b', later.toISOString().slice(0, 10), later.toISOString()),
        ];
        const entries = detectReturnAfterAbsence(list, 'Bipo', name);
        return entries.length === 1 && entries[0].body.includes(name);
      }),
      { numRuns: 30 },
    );
  });
});

describe('PROPERTY: detectStreakMilestones não dispara em sequências quebradas', () => {
  it('com 6 dias seguidos + gap + 6 dias mais, marco de 7 nunca dispara', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 30 }), gapDays => {
        const list: Checkin[] = [];
        const base = new Date('2026-01-01T10:00:00.000Z');
        for (let i = 0; i < 6; i++) {
          const d = new Date(base.getTime() + i * 86_400_000);
          list.push(mkCheckin(`a${i}`, d.toISOString().slice(0, 10), d.toISOString()));
        }
        for (let i = 0; i < 6; i++) {
          const d = new Date(base.getTime() + (6 + gapDays + i) * 86_400_000);
          list.push(mkCheckin(`b${i}`, d.toISOString().slice(0, 10), d.toISOString()));
        }
        const entries = detectStreakMilestones(list, 'Bipo');
        return entries.length === 0;
      }),
      { numRuns: 30 },
    );
  });
});

describe('PROPERTY: detectStreakMilestones tom sem culpa', () => {
  it('para qualquer streak: body NUNCA usa vocabulário de culpa', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 7, max: 100 }),
        fc.constantFrom(...NAMES),
        (days, name) => {
          const list: Checkin[] = [];
          const base = new Date('2026-01-01T10:00:00.000Z');
          for (let i = 0; i < days; i++) {
            const d = new Date(base.getTime() + i * 86_400_000);
            list.push(mkCheckin(`c${i}`, d.toISOString().slice(0, 10), d.toISOString()));
          }
          const entries = detectStreakMilestones(list, 'Bipo', name);
          return entries.every(e => !GUILT_WORDS.test(e.body));
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Grid de marcos de streak — cada milestone aparece UMA vez por sequência', () => {
  const MILESTONES = [7, 14, 30, 60, 100];
  it.each(MILESTONES)('streak de %i dias dispara o marco exato', n => {
    const list: Checkin[] = [];
    const base = new Date('2026-01-01T10:00:00.000Z');
    for (let i = 0; i < n; i++) {
      const d = new Date(base.getTime() + i * 86_400_000);
      list.push(mkCheckin(`c${i}`, d.toISOString().slice(0, 10), d.toISOString()));
    }
    const entries = detectStreakMilestones(list, 'Bipo');
    const exact = entries.find(e => e.hint === `${n} dias seguidos`);
    expect(exact).toBeDefined();
  });

  it.each(MILESTONES)('cada marco aparece exatamente 1 vez em streak de %i+', n => {
    const list: Checkin[] = [];
    const base = new Date('2026-01-01T10:00:00.000Z');
    for (let i = 0; i < n; i++) {
      const d = new Date(base.getTime() + i * 86_400_000);
      list.push(mkCheckin(`c${i}`, d.toISOString().slice(0, 10), d.toISOString()));
    }
    const entries = detectStreakMilestones(list, 'Bipo');
    const grouped = new Map<string, number>();
    for (const e of entries) {
      grouped.set(e.hint!, (grouped.get(e.hint!) ?? 0) + 1);
    }
    for (const [, count] of grouped) {
      expect(count).toBe(1);
    }
  });
});

describe('PROPERTY: entries são cronologicamente plausíveis', () => {
  it('occurred_at de cada entry de retorno = data do check-in mais novo', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 60 }), gap => {
        const base = new Date('2026-01-01T10:00:00.000Z');
        const later = new Date(base.getTime() + gap * 86_400_000);
        const list: Checkin[] = [
          mkCheckin('a', base.toISOString().slice(0, 10), base.toISOString()),
          mkCheckin('b', later.toISOString().slice(0, 10), later.toISOString()),
        ];
        const entries = detectReturnAfterAbsence(list, 'Bipo');
        return entries.length === 1 && entries[0].occurred_at === later.toISOString();
      }),
      { numRuns: 30 },
    );
  });
});
