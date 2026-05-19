/**
 * Regressões de backend: locks, race conditions, timezone, paywall etc.
 * Esses testes garantem que os fixes da auditoria de backend não regridam.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  importAll,
  mysteryBox,
  settings,
  streaks,
  todayLocal,
  wallet,
  withLock,
} from '@/lib/db';
import { applyCheckinToStreak, nextStreakState } from '@/lib/streak';
import { applyXp, levelFromXp } from '@/lib/xp';
import { pickDailyMission } from '@/content/missions';
import type { Mascot } from '@/types';

function reset() {
  (globalThis as any).__asyncStorageReset?.();
}

function mockMascot(): Mascot {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Test',
    personality: 'calmo',
    phase: 'bebe',
    mood: 'feliz',
    xp: 0,
    level: 1,
    energy: 80,
    health: 100,
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

describe('withLock — serializa execução por tabela', () => {
  beforeEach(reset);

  it('roda fn sequencialmente, não interleaves', async () => {
    const log: string[] = [];
    const work = (id: string, ms: number) =>
      withLock('test', async () => {
        log.push(`start:${id}`);
        await new Promise(r => setTimeout(r, ms));
        log.push(`end:${id}`);
      });
    await Promise.all([work('a', 30), work('b', 5), work('c', 5)]);
    // Sem lock, 'b' e 'c' terminariam antes de 'a'. Com lock, ordem total.
    expect(log).toEqual(['start:a', 'end:a', 'start:b', 'end:b', 'start:c', 'end:c']);
  });

  it('lock continua na fila mesmo se anterior rejeita', async () => {
    const log: string[] = [];
    const ok = withLock('test', async () => {
      throw new Error('boom');
    }).catch(() => log.push('caught'));
    const ok2 = withLock('test', async () => {
      log.push('after-error');
    });
    await Promise.all([ok, ok2]);
    expect(log).toContain('caught');
    expect(log).toContain('after-error');
  });
});

describe('wallet — locks e fluxos críticos', () => {
  beforeEach(reset);

  it('add em paralelo não perde moedas', async () => {
    await wallet.get('u1');
    await Promise.all(Array.from({ length: 20 }, () => wallet.add('u1', 5, 0)));
    const w = await wallet.get('u1');
    expect(w.coins).toBe(100);
  });

  it('spend concorrente NUNCA leva a saldo negativo', async () => {
    await wallet.add('u1', 100, 0);
    const tries = await Promise.all(
      Array.from({ length: 10 }, () => wallet.spend('u1', 30, 0))
    );
    const succeeded = tries.filter(Boolean).length;
    // Saldo inicial 100, custo 30 cada → máximo 3 sucessos (90 gastos)
    expect(succeeded).toBeLessThanOrEqual(3);
    const w = await wallet.get('u1');
    expect(w.coins).toBeGreaterThanOrEqual(0);
  });

  it('get não cria registro persistente (pure)', async () => {
    await wallet.get('u1');
    await wallet.get('u1');
    // Sem chamar add, não deve haver linha persistida.
    // Se chamarmos add, deve começar do zero.
    const added = await wallet.add('u1', 5, 0);
    expect(added.coins).toBe(5);
  });
});

describe('applyCheckinToStreak — concorrência', () => {
  beforeEach(reset);

  it('dois check-ins simultâneos no mesmo dia incrementam só 1x', async () => {
    // Inicia com last_active_date = ontem para que avance pra +1
    const yesterday = addDays(todayLocal(), -1);
    await streaks.upsert({
      user_id: 'uS',
      current_streak: 5,
      longest_streak: 5,
      last_active_date: yesterday,
      grace_days_left: 2,
      updated_at: new Date().toISOString(),
    });
    const [a, b] = await Promise.all([
      applyCheckinToStreak('uS'),
      applyCheckinToStreak('uS'),
    ]);
    const final = await streaks.get('uS');
    expect(final.current_streak).toBe(6);
    // Um avançou (graceUsed=false), outro foi same-day
    const advanced = [a, b].filter(r => r.streak.current_streak === 6).length;
    expect(advanced).toBeGreaterThanOrEqual(1);
  });
});

describe('nextStreakState — clock skew defensivo', () => {
  it('diff <= 0 (data no futuro) NÃO avança nem reseta', () => {
    const now = todayLocal();
    const tomorrow = addDays(now, 1);
    const state = nextStreakState(
      {
        user_id: 'u',
        current_streak: 7,
        longest_streak: 7,
        last_active_date: tomorrow, // futuro
        grace_days_left: 2,
        updated_at: '',
      },
      now
    );
    expect(state.sameDay).toBe(true);
    expect(state.next.current_streak).toBe(7);
  });
});

describe('daysBetween / addDays — DST-safe (UTC arithmetic)', () => {
  it('dias adjacentes = 1', () => {
    expect(daysBetween('2026-05-17', '2026-05-18')).toBe(1);
  });
  it('atravessa virada de mês', () => {
    expect(daysBetween('2026-04-30', '2026-05-01')).toBe(1);
  });
  it('atravessa virada de ano', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });
  it('negativo se b < a', () => {
    expect(daysBetween('2026-05-18', '2026-05-17')).toBe(-1);
  });
  it('addDays(+30) é consistente com daysBetween', () => {
    const base = '2026-05-01';
    const plus30 = addDays(base, 30);
    expect(daysBetween(base, plus30)).toBe(30);
  });
});

describe('applyXp — sanitização e ordem de mood', () => {
  it('rejeita XP negativo (sanity)', () => {
    const m = mockMascot();
    const r = applyXp(m, -10, 0);
    expect(r.delta).toBe(0);
    expect(r.mascot.xp).toBe(0);
  });

  it('rejeita dailyXpAlready negativo (sanity)', () => {
    const m = mockMascot();
    // Mesmo passando -50, daily cap respeitado
    const r = applyXp(m, 200, -50);
    expect(r.delta).toBeLessThanOrEqual(150);
  });

  it('mood reflete energy APÓS o boost de +10', () => {
    // energy 75 + 10 = 85 → empolgado (≥80)
    const m = { ...mockMascot(), energy: 75, mood: 'ok' as const };
    const r = applyXp(m, 10, 0);
    expect(r.mascot.energy).toBe(85);
    expect(r.mascot.mood).toBe('empolgado');
  });

  it('truncates deltaRaw fracionário', () => {
    const m = mockMascot();
    const r = applyXp(m, 10.7, 0);
    expect(r.delta).toBe(10);
  });
});

describe('levelFromXp — cap defensivo', () => {
  it('xp = NaN retorna 1 sem loop infinito', () => {
    expect(levelFromXp(NaN)).toBe(1);
  });
  it('xp = Infinity NÃO trava (cap em MAX_LEVEL)', () => {
    const lvl = levelFromXp(Infinity);
    expect(Number.isFinite(lvl)).toBe(true);
  });
});

describe('pickDailyMission — seed estável e variado entre dias', () => {
  it('mesmo dia produz mesma missão (idempotente)', () => {
    const a = pickDailyMission('calmo', '2026-05-18');
    const b = pickDailyMission('calmo', '2026-05-18');
    expect(a.id).toBe(b.id);
  });
  it('dias diferentes geralmente produzem missões diferentes', () => {
    const ids = new Set();
    for (let i = 0; i < 30; i++) {
      ids.add(pickDailyMission('calmo', `2026-05-${String(i + 1).padStart(2, '0')}`).id);
    }
    // Pool calmo tem ~14 missões; em 30 dias deve haver várias diferentes.
    expect(ids.size).toBeGreaterThan(3);
  });
});

describe('mysteryBox — total_opened', () => {
  beforeEach(reset);

  it('incrementa total_opened a cada open() bem-sucedido', async () => {
    const today = todayLocal();
    const tomorrow = addDays(today, 1);
    expect(await mysteryBox.openedCount('u1')).toBe(0);
    await mysteryBox.open('u1', today);
    expect(await mysteryBox.openedCount('u1')).toBe(1);
    // Mesmo dia: open retorna false e não incrementa
    await mysteryBox.open('u1', today);
    expect(await mysteryBox.openedCount('u1')).toBe(1);
    // Próximo dia: incrementa
    await mysteryBox.open('u1', tomorrow);
    expect(await mysteryBox.openedCount('u1')).toBe(2);
  });
});

describe('settings — pure getter, no side effects', () => {
  beforeEach(reset);

  it('get() não cria linha se não existia', async () => {
    const s1 = await settings.get('u1');
    expect(s1.theme_mode).toBe('system');
    // update muda algo
    const s2 = await settings.update('u1', { high_contrast: true });
    expect(s2.high_contrast).toBe(true);
    // get retorna o atualizado
    const s3 = await settings.get('u1');
    expect(s3.high_contrast).toBe(true);
  });
});

describe('importAll — schema validation', () => {
  beforeEach(reset);

  it('pula tabelas com payload inválido', async () => {
    const result = await importAll({
      wallet: [{ user_id: 'u1', coins: 100, gems: 5, updated_at: '' }],
      mascots: 'not-an-array' as any,
      checkins: [null as any], // contém row inválida
    });
    expect(result.imported).toContain('wallet');
    expect(result.skipped).toContain('mascots');
    expect(result.skipped).toContain('checkins');
    const w = await wallet.get('u1');
    expect(w.coins).toBe(100);
  });
});
