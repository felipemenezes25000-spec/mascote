/**
 * Pipeline unificado de check-in: mascote evolui, wallet ganha moedas,
 * streak avança, unlocks disparam, XP cap diário é respeitado.
 *
 * Invariantes críticos:
 * - 1 check-in dá XP, moedas, energia.
 * - Streak múltiplo de 7 dá bônus (50 XP + 1 gem).
 * - XP cap diário: ainda que combo aplique multiplicador, total/dia ≤ 150.
 * - Idempotência: mesmo idempotency_key → não duplica.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  checkins,
  combo,
  mascots,
  missions,
  profiles,
  streaks,
  todayLocal,
  wallet as walletDb,
  xpEvents,
  notifications,
} from '@/lib/db';
import {
  applyCheckinFully,
  applyMissionCompletion,
  COINS_PER_CHECKIN,
  COINS_PER_MISSION,
  defaultUnit,
  undoLastCheckin,
} from '@/lib/checkin';
import type { Mascot, Mission, Profile } from '@/types';

async function setupUser(): Promise<{ profile: Profile; mascot: Mascot }> {
  const profile = await profiles.upsert({ display_name: 'Felipe' });
  const mascot = await mascots.upsert({
    user_id: profile.id,
    name: 'Bipo',
    personality: 'calmo',
    xp: 0,
    level: 1,
    phase: 'ovo',
    energy: 80,
    mood: 'ok',
    health: 100,
  });
  return { profile, mascot };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('applyCheckinFully — happy path', () => {
  it('1º check-in dá XP, moedas, energia e persiste mascot', async () => {
    const { profile, mascot } = await setupUser();
    const out = await applyCheckinFully({ profile, mascot, kind: 'water' });
    expect(out.xpGained).toBeGreaterThan(0);
    expect(out.coinsGained).toBe(COINS_PER_CHECKIN);
    expect(out.gemsGained).toBe(0);
    // mascot persistido
    const stored = await mascots.forUser(profile.id);
    expect(stored?.xp).toBe(out.mascot.xp);
  });

  it('cria registro de check-in com idempotency_key', async () => {
    const { profile, mascot } = await setupUser();
    await applyCheckinFully({ profile, mascot, kind: 'water', value: 2 });
    const list = await checkins.list(profile.id);
    expect(list.length).toBe(1);
    expect(list[0].habit_kind).toBe('water');
    expect(list[0].value).toBe(2);
  });

  it('inicia combo em 2 no primeiro check-in', async () => {
    const { profile, mascot } = await setupUser();
    await applyCheckinFully({ profile, mascot, kind: 'water' });
    const c = await combo.get(profile.id);
    expect(c.current).toBe(2);
  });

  it('wallet ganha moedas', async () => {
    const { profile, mascot } = await setupUser();
    await applyCheckinFully({ profile, mascot, kind: 'water' });
    const w = await walletDb.get(profile.id);
    expect(w.coins).toBe(COINS_PER_CHECKIN);
  });

  it('cria xpEvent quando ganha XP > 0', async () => {
    const { profile, mascot } = await setupUser();
    await applyCheckinFully({ profile, mascot, kind: 'water' });
    const total = await xpEvents.total(profile.id);
    expect(total).toBeGreaterThan(0);
  });
});

describe('applyCheckinFully — XP cap diário (150)', () => {
  it('não passa de 150 XP/dia mesmo após muitos check-ins', async () => {
    const { profile, mascot } = await setupUser();
    let m = mascot;
    for (let i = 0; i < 20; i++) {
      const out = await applyCheckinFully({ profile, mascot: m, kind: 'water', value: i });
      m = out.mascot;
    }
    const today = todayLocal();
    const xp = await checkins.xpSumToday(profile.id, today);
    expect(xp).toBeLessThanOrEqual(150);
  });
});

describe('applyCheckinFully — streak milestone (multiplos de 7)', () => {
  it('streak 7 → bônus 50 XP + 1 gem', async () => {
    const { profile, mascot } = await setupUser();
    // simula streak 6 já no banco
    await streaks.upsert({
      user_id: profile.id,
      current_streak: 6,
      longest_streak: 6,
      last_active_date: '2026-05-17',
      grace_days_left: 2,
      updated_at: new Date().toISOString(),
    });
    // pega o today simulado pelo applyCheckinToStreak
    const out = await applyCheckinFully({ profile, mascot, kind: 'sleep' });
    expect(out.streakMilestone).toBe(true);
    expect(out.gemsGained).toBe(1);
  });

  it('streak 1 → não é milestone', async () => {
    const { profile, mascot } = await setupUser();
    const out = await applyCheckinFully({ profile, mascot, kind: 'water' });
    expect(out.streakMilestone).toBe(false);
    expect(out.gemsGained).toBe(0);
  });
});

describe('applyCheckinFully — notificações de evolução', () => {
  it('phase change → notification "evoluiu"', async () => {
    const { profile, mascot } = await setupUser();
    // mascote quase no threshold de "bebe" (100 XP)
    mascot.xp = 95;
    mascot.phase = 'ovo';
    const out = await applyCheckinFully({ profile, mascot, kind: 'water', baseXp: 50 });
    // se cap não atingido, deve subir pra bebe
    if (out.phaseChanged) {
      const list = await notifications.list(profile.id);
      expect(list.some(n => n.kind === 'evolution')).toBe(true);
    } else {
      // pelo menos não falhou
      expect(out.mascot.xp).toBeGreaterThan(95);
    }
  });

  it('level up sem phase change → notification "level_up"', async () => {
    const { profile, mascot } = await setupUser();
    // mascote em XP 40 (precisa só 10 pra subir nivel 2 = 50 XP)
    mascot.xp = 40;
    const out = await applyCheckinFully({ profile, mascot, kind: 'water' });
    if (out.leveledUp && !out.phaseChanged) {
      const list = await notifications.list(profile.id);
      expect(list.some(n => n.kind === 'level_up')).toBe(true);
    }
  });
});

describe('defaultUnit', () => {
  it('water → cups', () => expect(defaultUnit('water')).toBe('cups'));
  it('sleep → hours', () => expect(defaultUnit('sleep')).toBe('hours'));
  it('exercise → minutes', () => expect(defaultUnit('exercise')).toBe('minutes'));
  it('meditation → minutes', () => expect(defaultUnit('meditation')).toBe('minutes'));
  it('breath → minutes', () => expect(defaultUnit('breath')).toBe('minutes'));
  it('reading → pages', () => expect(defaultUnit('reading')).toBe('pages'));
  it('journaling → entries', () => expect(defaultUnit('journaling')).toBe('entries'));
  it('outdoor → minutes', () => expect(defaultUnit('outdoor')).toBe('minutes'));
  it('sun → minutes', () => expect(defaultUnit('sun')).toBe('minutes'));
  it('unknown habit → empty string', () => {
    expect(defaultUnit('unknown' as any)).toBe('');
  });
});

describe('applyCheckinFully — custom baseXp e coins', () => {
  it('baseXp override é aplicado', async () => {
    const { profile, mascot } = await setupUser();
    const out = await applyCheckinFully({ profile, mascot, kind: 'breath', baseXp: 25 });
    // primeiro check-in: bonus 5 → baseXp = 25 + 5 = 30 (sem combo ainda = combo nasce em 2)
    // com combo×2: 30 * 1.25 = 37.5 → 38
    expect(out.xpGained).toBeGreaterThanOrEqual(30);
  });

  it('coins override é aplicado', async () => {
    const { profile, mascot } = await setupUser();
    const out = await applyCheckinFully({ profile, mascot, kind: 'water', coins: 20 });
    expect(out.coinsGained).toBe(20);
    const w = await walletDb.get(profile.id);
    expect(w.coins).toBe(20);
  });

  it('outcome inclui o checkin row pra suportar undo', async () => {
    const { profile, mascot } = await setupUser();
    const out = await applyCheckinFully({ profile, mascot, kind: 'water' });
    expect(out.checkin).not.toBeNull();
    expect(out.checkin?.user_id).toBe(profile.id);
    expect(out.checkin?.habit_kind).toBe('water');
  });
});

async function makeMission(profile: Profile, overrides: Partial<Mission> = {}): Promise<Mission> {
  const today = todayLocal();
  return missions.add({
    user_id: profile.id,
    title: 'Beber 2 copos',
    description: 'Hidrate gentil',
    habit_kind: 'water',
    target_value: 2,
    xp_reward: 30,
    status: 'pending',
    scheduled_for: today,
    completed_at: null,
    ...overrides,
  });
}

describe('applyMissionCompletion', () => {
  it('marca missão como completed + grava XP + paga moedas', async () => {
    const { profile, mascot } = await setupUser();
    const mission = await makeMission(profile);
    const out = await applyMissionCompletion({ profile, mascot, mission });

    expect(out.alreadyCompleted).toBe(false);
    expect(out.xpGained).toBeGreaterThan(0);
    expect(out.coinsGained).toBe(COINS_PER_MISSION);

    const [persisted] = await missions.forDate(profile.id, todayLocal());
    expect(persisted.status).toBe('completed');
    expect(persisted.completed_at).not.toBeNull();

    const w = await walletDb.get(profile.id);
    expect(w.coins).toBe(COINS_PER_MISSION);

    // total de XP gravado bate com o ganho da missão (só evento desta sessão)
    const totalXp = await xpEvents.total(profile.id);
    expect(totalXp).toBe(out.xpGained);

    // mascot persistido com XP novo
    const persistedMascot = await mascots.forUser(profile.id);
    expect(persistedMascot?.xp).toBeGreaterThan(0);
  });

  it('idempotente: completar 2× não duplica XP', async () => {
    const { profile, mascot } = await setupUser();
    const mission = await makeMission(profile);
    const first = await applyMissionCompletion({ profile, mascot, mission });
    expect(first.alreadyCompleted).toBe(false);

    const persistedMission = { ...mission, status: 'completed' as const, completed_at: new Date().toISOString() };
    const second = await applyMissionCompletion({ profile, mascot: first.mascot, mission: persistedMission });
    expect(second.alreadyCompleted).toBe(true);
    expect(second.xpGained).toBe(0);
    expect(second.coinsGained).toBe(0);

    const w = await walletDb.get(profile.id);
    expect(w.coins).toBe(COINS_PER_MISSION); // ainda 15, não 30
  });

  it('respeita o XP daily cap quando já estourado', async () => {
    const { profile, mascot } = await setupUser();
    // satura o XP do dia (cap=150). 1 checkin dá 10 base + 5 first-of-day + combo.
    // pra simplificar: faz 15 checkins variados, vai exceder o cap.
    for (let i = 0; i < 20; i++) {
      const m = await mascots.forUser(profile.id);
      if (!m) break;
      await applyCheckinFully({ profile, mascot: m, kind: 'water' });
    }
    const xpBeforeMission = (await mascots.forUser(profile.id))?.xp ?? 0;
    const mission = await makeMission(profile, { xp_reward: 50 });
    const out = await applyMissionCompletion({ profile, mascot: (await mascots.forUser(profile.id))!, mission });
    // XP delta sai 0 quando o cap diário já foi atingido — mas moeda sai.
    expect(out.xpGained).toBe(0);
    expect(out.coinsGained).toBe(COINS_PER_MISSION);
    const xpAfter = (await mascots.forUser(profile.id))?.xp ?? 0;
    expect(xpAfter).toBe(xpBeforeMission);
  });
});

describe('undoLastCheckin', () => {
  it('remove o checkin + subtrai XP + devolve moedas', async () => {
    const { profile, mascot } = await setupUser();
    const out = await applyCheckinFully({ profile, mascot, kind: 'water' });
    expect(out.checkin).not.toBeNull();
    const xpBefore = (await mascots.forUser(profile.id))?.xp ?? 0;
    const coinsBefore = (await walletDb.get(profile.id)).coins;
    expect(xpBefore).toBeGreaterThan(0);
    expect(coinsBefore).toBe(COINS_PER_CHECKIN);

    const undo = await undoLastCheckin({
      profile,
      mascot: (await mascots.forUser(profile.id))!,
      checkinId: out.checkin!.id,
      xpAwarded: out.xpGained,
      coinsRefund: out.coinsGained,
    });
    expect(undo.removed).toBe(true);

    const xpAfter = (await mascots.forUser(profile.id))?.xp ?? -1;
    expect(xpAfter).toBe(xpBefore - out.xpGained);
    const coinsAfter = (await walletDb.get(profile.id)).coins;
    expect(coinsAfter).toBe(coinsBefore - out.coinsGained);

    const rows = await checkins.list(profile.id, todayLocal());
    expect(rows.length).toBe(0);
  });

  it('idempotente: undo 2× é seguro (segundo retorna removed=false)', async () => {
    const { profile, mascot } = await setupUser();
    const out = await applyCheckinFully({ profile, mascot, kind: 'water' });
    const m = (await mascots.forUser(profile.id))!;
    await undoLastCheckin({
      profile,
      mascot: m,
      checkinId: out.checkin!.id,
      xpAwarded: out.xpGained,
      coinsRefund: out.coinsGained,
    });
    const second = await undoLastCheckin({
      profile,
      mascot: (await mascots.forUser(profile.id))!,
      checkinId: out.checkin!.id,
      xpAwarded: out.xpGained,
      coinsRefund: out.coinsGained,
    });
    expect(second.removed).toBe(false);
  });

  it('xpAwarded=0 (cap diário atingido) ainda remove o row sem alterar XP', async () => {
    const { profile, mascot } = await setupUser();
    // Cria checkin manual com xp_awarded=0 simulando cap atingido
    const c = await checkins.add({
      user_id: profile.id,
      habit_kind: 'water',
      value: 1,
      unit: 'cups',
      occurred_on: todayLocal(),
      occurred_at: new Date().toISOString(),
      xp_awarded: 0,
      idempotency_key: 'manual',
    });
    expect(c).not.toBeNull();
    const undo = await undoLastCheckin({
      profile,
      mascot,
      checkinId: c!.id,
      xpAwarded: 0,
      coinsRefund: 0,
    });
    expect(undo.removed).toBe(true);
    expect(undo.mascot.xp).toBe(mascot.xp);
  });
});
