/**
 * Testes das tabelas de gamificação (wallet, daily, mystery, combo).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  combo,
  comboXpBonus,
  dailyReward,
  mysteryBox,
  todayLocal,
  wallet,
} from '@/lib/db';

const USER = 'user-test-db';

function reset() {
  (globalThis as any).__asyncStorageReset?.();
}

describe('wallet', () => {
  beforeEach(reset);

  it('começa zerado', async () => {
    const w = await wallet.get(USER);
    expect(w.coins).toBe(0);
    expect(w.gems).toBe(0);
  });

  it('adiciona moedas e gemas', async () => {
    await wallet.add(USER, 10, 1);
    const w = await wallet.get(USER);
    expect(w.coins).toBe(10);
    expect(w.gems).toBe(1);
  });

  it('subtrai com spend', async () => {
    await wallet.add(USER, 100, 5);
    const r = await wallet.spend(USER, 30, 1);
    expect(r).not.toBeNull();
    expect(r!.coins).toBe(70);
    expect(r!.gems).toBe(4);
  });

  it('spend retorna null se insuficiente', async () => {
    await wallet.add(USER, 10, 0);
    const r = await wallet.spend(USER, 50, 0);
    expect(r).toBeNull();
  });

  it('não vai a negativo', async () => {
    await wallet.add(USER, 5, 0);
    await wallet.add(USER, -10, 0); // tentar tirar mais do que tem
    const w = await wallet.get(USER);
    expect(w.coins).toBe(0); // cap em 0
  });
});

describe('dailyReward', () => {
  beforeEach(reset);

  it('claim no D1 funciona', async () => {
    const today = todayLocal();
    const r = await dailyReward.claim(USER, today);
    expect(r).not.toBeNull();
    expect(r!.current_day).toBe(1);
  });

  it('claim duas vezes no mesmo dia → null', async () => {
    const today = todayLocal();
    await dailyReward.claim(USER, today);
    const r2 = await dailyReward.claim(USER, today);
    expect(r2).toBeNull();
  });
});

describe('mysteryBox', () => {
  beforeEach(reset);

  it('abrir uma vez por dia retorna true', async () => {
    const today = todayLocal();
    const r = await mysteryBox.open(USER, today);
    expect(r).toBe(true);
  });

  it('abrir duas vezes no mesmo dia retorna false', async () => {
    const today = todayLocal();
    await mysteryBox.open(USER, today);
    const r2 = await mysteryBox.open(USER, today);
    expect(r2).toBe(false);
  });
});

describe('combo', () => {
  beforeEach(reset);

  it('começa em 1', async () => {
    const c = await combo.get(USER);
    expect(c.current).toBe(1);
  });

  it('bump incrementa', async () => {
    const c1 = await combo.bump(USER);
    expect(c1.current).toBe(2);
    const c2 = await combo.bump(USER);
    expect(c2.current).toBe(3);
  });

  it('cap em 5', async () => {
    for (let i = 0; i < 10; i++) await combo.bump(USER);
    const c = await combo.get(USER);
    expect(c.current).toBe(5);
  });
});

describe('comboXpBonus', () => {
  it('×1 → 0% extra', () => {
    expect(comboXpBonus(1)).toBe(0);
  });
  it('×2 → 25% extra', () => {
    expect(comboXpBonus(2)).toBe(25);
  });
  it('×5 → 100% extra', () => {
    expect(comboXpBonus(5)).toBe(100);
  });
});
