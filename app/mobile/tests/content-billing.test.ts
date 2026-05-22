/**
 * Billing — fonte única de verdade pra tiers e preços.
 *
 * Crítico:
 * - 3 tiers canônicos (free, plus_monthly, plus_annual).
 * - Plus anual deve ter savingsPct > 0 (caso contrário, faz sentido?).
 * - Formatação BR (R$ X,YY com vírgula).
 */

import { describe, expect, it } from 'vitest';
import { BILLING_TIERS, formatBRL, formatPerMonth, getTier } from '@/content/billing';

describe('BILLING_TIERS', () => {
  it('contém os 3 tiers canônicos na ordem free → monthly → annual', () => {
    expect(BILLING_TIERS.map(t => t.id)).toEqual(['free', 'plus_monthly', 'plus_annual']);
  });

  it('Free tem cents = 0', () => {
    const free = getTier('free');
    expect(free.monthlyCents).toBe(0);
    expect(free.totalCents).toBe(0);
  });

  it('Bipo Plus mensal R$ 19,90', () => {
    const m = getTier('plus_monthly');
    expect(m.name).toBe('Bipo Plus');
    expect(m.monthlyCents).toBe(1990);
    expect(m.totalCents).toBe(1990);
    expect(m.period).toBe('monthly');
    expect(m.trialDays).toBe(7);
  });

  it('Bipo Plus anual R$ 199,00 com badge "RECOMENDADO"', () => {
    const a = getTier('plus_annual');
    expect(a.name).toBe('Bipo Plus Anual');
    expect(a.totalCents).toBe(19900);
    expect(a.period).toBe('annual');
    expect(a.badge).toBe('RECOMENDADO');
  });

  it('Plus anual tem savingsPct > 0 (compensa)', () => {
    const a = getTier('plus_annual');
    expect(a.savingsPct).toBeGreaterThan(0);
    expect(a.savingsPct).toBeLessThan(100);
  });

  it('Plus anual e mensal partilham benefits (mesmo conjunto)', () => {
    const m = getTier('plus_monthly');
    const a = getTier('plus_annual');
    expect(a.benefits).toEqual(m.benefits);
  });

  it('getTier lança em id desconhecido', () => {
    expect(() => getTier('xyz' as any)).toThrow(/unknown tier/);
  });
});

describe('formatBRL', () => {
  it('formata 0 como "R$ 0,00"', () => {
    expect(formatBRL(0)).toBe('R$ 0,00');
  });
  it('formata 2490 como "R$ 24,90"', () => {
    expect(formatBRL(2490)).toBe('R$ 24,90');
  });
  it('usa vírgula decimal (PT-BR)', () => {
    expect(formatBRL(199)).toBe('R$ 1,99');
  });
  it('formata valores grandes com 2 decimais', () => {
    expect(formatBRL(123456)).toBe('R$ 1234,56');
  });
});

describe('formatPerMonth', () => {
  it('"Grátis" para free', () => {
    expect(formatPerMonth(getTier('free'))).toBe('Grátis');
  });
  it('"R$ 19,90/mês" para mensal', () => {
    expect(formatPerMonth(getTier('plus_monthly'))).toBe('R$ 19,90/mês');
  });
  it('"R$ X,YY/mês (cobrado R$ A,BC/ano)" para anual', () => {
    const s = formatPerMonth(getTier('plus_annual'));
    expect(s).toMatch(/\/mês/);
    expect(s).toMatch(/\/ano/);
    expect(s).toMatch(/R\$ \d+,\d{2}/);
  });
});

describe('PENTEST — billing integrity', () => {
  it('nenhum tier tem cents negativo (anti adversarial)', () => {
    for (const t of BILLING_TIERS) {
      expect(t.monthlyCents).toBeGreaterThanOrEqual(0);
      expect(t.totalCents).toBeGreaterThanOrEqual(0);
    }
  });

  it('Plus anual NÃO custa mais que 12× o mensal', () => {
    const m = getTier('plus_monthly');
    const a = getTier('plus_annual');
    expect(a.totalCents).toBeLessThanOrEqual(m.totalCents * 12);
  });

  it('Plus monthlyCents anual = total/12 (consistência matemática)', () => {
    const a = getTier('plus_annual');
    expect(a.monthlyCents).toBe(Math.round(a.totalCents / 12));
  });

  it('Free não tem trial (não faz sentido)', () => {
    expect(getTier('free').trialDays).toBe(0);
  });

  it('Free benefits NÃO incluem features Plus', () => {
    const free = getTier('free');
    const joined = free.benefits.join(' ').toLowerCase();
    expect(joined).not.toMatch(/ilimitado|todos os cenários|exportação/);
  });
});
