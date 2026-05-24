/**
 * Sistema de notificações in-app — respeita opt-out, quiet hours, pause e dedup.
 *
 * Garantias:
 * - push_enabled = false → bloqueia tudo exceto `safety`.
 * - paused_until > today → bloqueia tudo exceto `safety`.
 * - quiet hours bloqueia não-críticas.
 * - DEDUP_PER_DAY (weekly_report, streak_at_risk, reminder) → 1 por dia.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifications, settings, profiles } from '@/lib/db';
import {
  maybeNotifyStreakAtRisk,
  notify,
  notifyMascotBirthday,
  notifyWeeklyReportReady,
} from '@/lib/notify';
import type { Profile } from '@/types';

async function makeProfile(): Promise<Profile> {
  return profiles.upsert({ display_name: 'Felipe' });
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('notify — opt-out e pause', () => {
  it('push_enabled OFF bloqueia kind="reminder"', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { push_enabled: false });
    const result = await notify(p, 'reminder', 'oi', 'corpo');
    expect(result).toBeNull();
  });

  it('push_enabled OFF NÃO bloqueia kind="safety"', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { push_enabled: false });
    const result = await notify(p, 'safety', 'urgente', 'corpo');
    expect(result).not.toBeNull();
    expect(result?.kind).toBe('safety');
  });

  it('paused_until futuro bloqueia reminder', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { paused_until: '2099-12-31' });
    const result = await notify(p, 'reminder', 't', 'b');
    expect(result).toBeNull();
  });

  it('paused_until passado NÃO bloqueia', async () => {
    const p = await makeProfile();
    // forçar fora de quiet hours
    await settings.update(p.id, { paused_until: '2000-01-01', quiet_start: '00:00', quiet_end: '00:00' });
    const result = await notify(p, 'reminder', 't', 'b');
    expect(result).not.toBeNull();
  });

  it('paused_until futuro NÃO bloqueia safety', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { paused_until: '2099-12-31' });
    const result = await notify(p, 'safety', 'urgente', 'b');
    expect(result).not.toBeNull();
  });
});

describe('notify — quiet hours', () => {
  it('dentro de quiet window (22-08, com agora=23h) bloqueia', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '22:00', quiet_end: '08:00' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 18, 23, 0));
    const r = await notify(p, 'reminder', 't', 'b');
    expect(r).toBeNull();
    vi.useRealTimers();
  });

  it('fora de quiet window passa', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '22:00', quiet_end: '08:00' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 18, 12, 0));
    const r = await notify(p, 'reminder', 't', 'b');
    expect(r).not.toBeNull();
    vi.useRealTimers();
  });

  it('quiet "9:00" sem zero-pad → normaliza pra "09:00"', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '9:00', quiet_end: '17:00' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 18, 10, 0));
    const r = await notify(p, 'reminder', 't', 'b');
    expect(r).toBeNull();
    vi.useRealTimers();
  });

  it('quiet start === end → janela vazia (não bloqueia)', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '08:00', quiet_end: '08:00' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 18, 8, 0));
    const r = await notify(p, 'reminder', 't', 'b');
    expect(r).not.toBeNull();
    vi.useRealTimers();
  });

  it('safety burra quiet hours', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '23:59' });
    const r = await notify(p, 'safety', 't', 'b');
    expect(r).not.toBeNull();
  });

  it('quiet sem crossover (08-17) bloqueia 12h', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '08:00', quiet_end: '17:00' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 18, 12, 0));
    const r = await notify(p, 'reminder', 't', 'b');
    expect(r).toBeNull();
    vi.useRealTimers();
  });
});

describe('notify — dedup por dia', () => {
  it('weekly_report 2x no mesmo dia → 2ª retorna null', async () => {
    const p = await makeProfile();
    // forçar fora de quiet
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    const r1 = await notify(p, 'weekly_report', 't1', 'b1');
    const r2 = await notify(p, 'weekly_report', 't2', 'b2');
    expect(r1).not.toBeNull();
    expect(r2).toBeNull();
  });

  it('streak_at_risk dedup', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    const r1 = await notify(p, 'streak_at_risk', 't', 'b');
    const r2 = await notify(p, 'streak_at_risk', 't', 'b');
    expect(r1).not.toBeNull();
    expect(r2).toBeNull();
  });

  it('reminder dedup', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    await notify(p, 'reminder', 't', 'b');
    const r2 = await notify(p, 'reminder', 't', 'b');
    expect(r2).toBeNull();
  });

  it('kinds NÃO dedup (safety, evolution) podem repetir', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    const r1 = await notify(p, 'safety', 't', 'b');
    const r2 = await notify(p, 'safety', 't', 'b');
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
  });
});

describe('notifyWeeklyReportReady', () => {
  it('cria notificação weekly_report', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    await notifyWeeklyReportReady(p);
    const list = await notifications.list(p.id);
    expect(list.some(n => n.kind === 'weekly_report')).toBe(true);
  });
});

describe('maybeNotifyStreakAtRisk', () => {
  beforeEach(async () => {
    // garante fora de quiet hours
  });

  it('streakDays === 0 → no-op', async () => {
    const p = await makeProfile();
    await maybeNotifyStreakAtRisk(p, 0, null);
    const list = await notifications.list(p.id);
    expect(list).toEqual([]);
  });

  it('lastActive === null → no-op', async () => {
    const p = await makeProfile();
    await maybeNotifyStreakAtRisk(p, 3, null);
    expect((await notifications.list(p.id))).toEqual([]);
  });

  it('lastActive === today → no-op', async () => {
    const p = await makeProfile();
    const { todayLocal } = await import('@/lib/db');
    await maybeNotifyStreakAtRisk(p, 3, todayLocal());
    expect((await notifications.list(p.id))).toEqual([]);
  });

  it('hour < 18 → no-op', async () => {
    const p = await makeProfile();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 18, 10, 0));
    await maybeNotifyStreakAtRisk(p, 3, '2026-05-17');
    expect((await notifications.list(p.id))).toEqual([]);
    vi.useRealTimers();
  });

  it('hour >= 22 → no-op', async () => {
    const p = await makeProfile();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 18, 22, 0));
    await maybeNotifyStreakAtRisk(p, 3, '2026-05-17');
    expect((await notifications.list(p.id))).toEqual([]);
    vi.useRealTimers();
  });

  it('hour 20h + streak 3 + yesterday → cria notification', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 18, 20, 0));
    await maybeNotifyStreakAtRisk(p, 3, '2026-05-17');
    const list = await notifications.list(p.id);
    expect(list.some(n => n.kind === 'streak_at_risk')).toBe(true);
    expect(list[0]?.title).toContain('ritmo');
    vi.useRealTimers();
  });

  it('pluralizes "dia" para streak >= 2', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 18, 20, 0));
    await maybeNotifyStreakAtRisk(p, 5, '2026-05-17');
    const list = await notifications.list(p.id);
    expect(list[0]?.body).toMatch(/5 dias/);
    vi.useRealTimers();
  });

  it('singular "dia" para streak === 1', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 18, 20, 0));
    await maybeNotifyStreakAtRisk(p, 1, '2026-05-17');
    const list = await notifications.list(p.id);
    expect(list[0]?.body).toMatch(/1 dia(?!s)/);
    vi.useRealTimers();
  });
});

describe('notifyMascotBirthday — milestones 30/100/365', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('30 dias dispara 30-day milestone', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    await notifyMascotBirthday(p, 30);
    const list = await notifications.list(p.id);
    expect(list.some(n => n.kind === 'birthday' && n.title.includes('mês'))).toBe(true);
  });

  it('100 dias dispara 100-day milestone', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    await notifyMascotBirthday(p, 100);
    const list = await notifications.list(p.id);
    expect(list.some(n => n.title.includes('100'))).toBe(true);
  });

  it('365 dias dispara 1-ano milestone', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    await notifyMascotBirthday(p, 365);
    const list = await notifications.list(p.id);
    expect(list.some(n => n.title.includes('ano'))).toBe(true);
  });

  it('milestone dispara só uma vez (mesmo chamando 2x)', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    await notifyMascotBirthday(p, 30);
    await notifyMascotBirthday(p, 30);
    const list = await notifications.list(p.id);
    expect(list.filter(n => n.kind === 'birthday' && n.title.includes('mês')).length).toBe(1);
  });

  it('dia 29 NÃO dispara 30-day milestone (ainda)', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    await notifyMascotBirthday(p, 29);
    const list = await notifications.list(p.id);
    expect(list.some(n => n.kind === 'birthday')).toBe(false);
  });

  it('dia 38 NÃO dispara mais (passou da grace 7d)', async () => {
    const p = await makeProfile();
    await settings.update(p.id, { quiet_start: '00:00', quiet_end: '00:00' });
    await notifyMascotBirthday(p, 38);
    const list = await notifications.list(p.id);
    expect(list.some(n => n.kind === 'birthday')).toBe(false);
  });
});
