/**
 * Grid exaustivo do wallet — add/spend/get com inputs malformados.
 *
 * Cada teste usa um user_id único pra isolar estado AsyncStorage entre
 * casos (sem cleanup). Property: wallet NUNCA fica negativo.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { wallet } from '@/lib/db';

function uid(): string {
  return `wallet-test-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

describe('wallet.get — usuário novo', () => {
  it('retorna 0 coins, 0 gems', async () => {
    const w = await wallet.get(uid());
    expect(w.coins).toBe(0);
    expect(w.gems).toBe(0);
  });

  it.each([1, 2, 3, 4, 5])('chamadas repetidas (%i) retornam o mesmo estado', async _ => {
    const u = uid();
    const a = await wallet.get(u);
    const b = await wallet.get(u);
    expect(a.coins).toBe(b.coins);
    expect(a.gems).toBe(b.gems);
  });
});

describe('wallet.add — coins', () => {
  const AMOUNTS = [0, 1, 5, 10, 50, 100, 500, 1000];

  it.each(AMOUNTS)('add(%i, 0) acumula coins', async coins => {
    const u = uid();
    const w = await wallet.add(u, coins, 0);
    expect(w.coins).toBe(coins);
    expect(w.gems).toBe(0);
  });

  it.each(AMOUNTS)('add(%i) duas vezes acumula 2x', async coins => {
    const u = uid();
    await wallet.add(u, coins, 0);
    const w = await wallet.add(u, coins, 0);
    expect(w.coins).toBe(coins * 2);
  });
});

describe('wallet.add — gems', () => {
  const AMOUNTS = [0, 1, 2, 5, 10, 50];

  it.each(AMOUNTS)('add(0, %i) acumula gems', async gems => {
    const u = uid();
    const w = await wallet.add(u, 0, gems);
    expect(w.gems).toBe(gems);
  });
});

describe('wallet.add — sanitização', () => {
  it.each([NaN, Infinity, -Infinity])('coins inválido (%s) é tratado como 0', async coins => {
    const u = uid();
    const w = await wallet.add(u, coins as number, 0);
    expect(w.coins).toBe(0);
  });

  it.each([NaN, Infinity, -Infinity])('gems inválido (%s) é tratado como 0', async gems => {
    const u = uid();
    const w = await wallet.add(u, 0, gems as number);
    expect(w.gems).toBe(0);
  });

  it('coins negativo grande resulta em wallet com 0 (clamp Math.max)', async () => {
    const u = uid();
    const w = await wallet.add(u, -1000, 0);
    expect(w.coins).toBe(0);
  });
});

describe('wallet.spend', () => {
  it('spend mais do que tem retorna null (sem mutar)', async () => {
    const u = uid();
    await wallet.add(u, 10, 0);
    const result = await wallet.spend(u, 100, 0);
    expect(result).toBeNull();
    const after = await wallet.get(u);
    expect(after.coins).toBe(10);
  });

  it.each([1, 5, 10, 25, 50])('spend(%i) deduz o valor exato', async amount => {
    const u = uid();
    await wallet.add(u, 100, 0);
    const w = await wallet.spend(u, amount, 0);
    expect(w?.coins).toBe(100 - amount);
  });

  it('spend de coins negativo é tratado como 0', async () => {
    const u = uid();
    await wallet.add(u, 50, 0);
    const w = await wallet.spend(u, -10, 0);
    expect(w?.coins).toBe(50);
  });

  it('spend NaN é tratado como 0', async () => {
    const u = uid();
    await wallet.add(u, 50, 0);
    const w = await wallet.spend(u, NaN as number, 0);
    expect(w?.coins).toBe(50);
  });

  it('spend Infinity é tratado como 0 (não esgota a carteira)', async () => {
    const u = uid();
    await wallet.add(u, 50, 0);
    const w = await wallet.spend(u, Infinity as number, 0);
    expect(w?.coins).toBe(50);
  });

  it('spend gems não-disponíveis retorna null', async () => {
    const u = uid();
    await wallet.add(u, 0, 1);
    const result = await wallet.spend(u, 0, 5);
    expect(result).toBeNull();
  });

  it('spend zero é no-op válido', async () => {
    const u = uid();
    await wallet.add(u, 10, 0);
    const w = await wallet.spend(u, 0, 0);
    expect(w?.coins).toBe(10);
  });
});

describe('wallet.spend — saldo persistido corrompido (auditoria 2026-06-29)', () => {
  // Simula import malicioso/corrompido com saldo NÃO-finito já no storage.
  // Sem o saneamento do saldo lido, `'abc' < 100` (ou `NaN < 100`) é `false`,
  // furando o guard de saldo → compra grátis + persistência de NaN irrecuperável.
  async function seedCorruptWallet(user_id: string, coins: unknown, gems: unknown) {
    const raw = await AsyncStorage.getItem('mascote:wallet');
    const rows = raw ? (JSON.parse(raw) as unknown[]) : [];
    rows.push({ user_id, coins, gems, updated_at: new Date().toISOString() });
    await AsyncStorage.setItem('mascote:wallet', JSON.stringify(rows));
  }

  it('saldo não-numérico não libera compra grátis (spend retorna null)', async () => {
    const u = uid();
    await seedCorruptWallet(u, 'abc', 'abc');
    const result = await wallet.spend(u, 100, 0);
    expect(result).toBeNull();
  });

  it('saldo nulo/corrompido é auto-curado para 0 no próximo add', async () => {
    const u = uid();
    await seedCorruptWallet(u, 'abc', null);
    const w = await wallet.add(u, 10, 5);
    expect(w.coins).toBe(10);
    expect(w.gems).toBe(5);
  });
});

describe('PROPERTY: wallet sempre não-negativo', () => {
  it('para qualquer sequência de add/spend, coins >= 0 e gems >= 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.tuple(
            fc.constantFrom('add', 'spend' as const),
            fc.integer({ min: -100, max: 100 }),
            fc.integer({ min: -100, max: 100 }),
          ),
          { maxLength: 20 },
        ),
        async ops => {
          const u = uid();
          for (const [op, coins, gems] of ops) {
            if (op === 'add') await wallet.add(u, coins, gems);
            else await wallet.spend(u, coins, gems);
          }
          const w = await wallet.get(u);
          return w.coins >= 0 && w.gems >= 0;
        },
      ),
      { numRuns: 30 },
    );
  });
});

describe('wallet.get persistência', () => {
  it('add depois get retorna mesmo estado', async () => {
    const u = uid();
    const a = await wallet.add(u, 17, 3);
    const b = await wallet.get(u);
    expect(b.coins).toBe(a.coins);
    expect(b.gems).toBe(a.gems);
  });

  it('updated_at é ISO string', async () => {
    const u = uid();
    const w = await wallet.add(u, 1, 0);
    expect(w.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
