/**
 * Testes do streak forgiving — outra mecânica crítica.
 * Bug aqui causa user perder dias indevidamente e dar churn.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { applyCheckinToStreak } from '@/lib/streak';
import { streaks, todayLocal } from '@/lib/db';

const USER = 'user-test-streak';

function reset() {
  (globalThis as any).__asyncStorageReset?.();
}

describe('applyCheckinToStreak — fluxos básicos', () => {
  beforeEach(reset);

  it('primeiro check-in → streak = 1', async () => {
    const result = await applyCheckinToStreak(USER);
    expect(result.streak.current_streak).toBe(1);
    expect(result.streak.last_active_date).toBe(todayLocal());
    expect(result.brokenAndRestarted).toBe(false);
  });

  it('dois check-ins no mesmo dia → não duplica', async () => {
    await applyCheckinToStreak(USER);
    const r2 = await applyCheckinToStreak(USER);
    expect(r2.streak.current_streak).toBe(1);
  });

  it('inicia com 2 grace days', async () => {
    const s = await streaks.get(USER);
    expect(s.grace_days_left).toBe(2);
  });
});

describe('applyCheckinToStreak — streak forgiving', () => {
  beforeEach(reset);

  it('1 dia faltado dentro de grace → preserva streak', async () => {
    // simular: ontem fez check-in, hoje pulou (não chama), amanhã fez
    const today = todayLocal();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const ymd = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`;

    await streaks.upsert({
      user_id: USER,
      current_streak: 5,
      longest_streak: 5,
      last_active_date: ymd,
      grace_days_left: 2,
      updated_at: new Date().toISOString(),
    });

    const result = await applyCheckinToStreak(USER);
    expect(result.streak.current_streak).toBe(6); // continuou
    expect(result.streak.grace_days_left).toBe(1); // gastou 1
    expect(result.graceUsed).toBe(true);
    expect(result.brokenAndRestarted).toBe(false);
  });

  it('mais dias faltados que graces → reseta', async () => {
    // simular: última atividade há 5 dias, com só 2 graces
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const ymd = `${fiveDaysAgo.getFullYear()}-${String(fiveDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(fiveDaysAgo.getDate()).padStart(2, '0')}`;

    await streaks.upsert({
      user_id: USER,
      current_streak: 10,
      longest_streak: 10,
      last_active_date: ymd,
      grace_days_left: 2,
      updated_at: new Date().toISOString(),
    });

    const result = await applyCheckinToStreak(USER);
    expect(result.streak.current_streak).toBe(1);
    expect(result.streak.grace_days_left).toBe(2); // reset
    expect(result.brokenAndRestarted).toBe(true);
  });

  it('longest_streak preservado quando reseta', async () => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const ymd = `${fiveDaysAgo.getFullYear()}-${String(fiveDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(fiveDaysAgo.getDate()).padStart(2, '0')}`;

    await streaks.upsert({
      user_id: USER,
      current_streak: 30,
      longest_streak: 30,
      last_active_date: ymd,
      grace_days_left: 2,
      updated_at: new Date().toISOString(),
    });

    const result = await applyCheckinToStreak(USER);
    expect(result.streak.longest_streak).toBe(30); // preservado!
    expect(result.streak.current_streak).toBe(1);
  });
});

describe('applyCheckinToStreak — milestones', () => {
  beforeEach(reset);

  it('chegar em 14 dias → ganha +1 grace', async () => {
    // simular streak de 13 dias, último ontem
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ymd = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    await streaks.upsert({
      user_id: USER,
      current_streak: 13,
      longest_streak: 13,
      last_active_date: ymd,
      grace_days_left: 2,
      updated_at: new Date().toISOString(),
    });

    const result = await applyCheckinToStreak(USER);
    expect(result.streak.current_streak).toBe(14);
    expect(result.streak.grace_days_left).toBe(3); // ganhou +1
  });

  it('grace cap em 5', async () => {
    // simular streak 27 com 5 graces
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ymd = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    await streaks.upsert({
      user_id: USER,
      current_streak: 27,
      longest_streak: 27,
      last_active_date: ymd,
      grace_days_left: 5,
      updated_at: new Date().toISOString(),
    });

    const result = await applyCheckinToStreak(USER);
    expect(result.streak.current_streak).toBe(28); // múltiplo de 14
    expect(result.streak.grace_days_left).toBe(5); // não passa do cap
  });
});
