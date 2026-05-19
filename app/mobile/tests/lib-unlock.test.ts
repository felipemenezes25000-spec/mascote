/**
 * Pipeline de unlocks: achievements, accessories, scenes baseados em estado
 * do mascote + streak + checkins.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  achievements,
  checkins,
  inventory,
  mascots,
  missions,
  profiles,
  streaks,
  userScenes,
} from '@/lib/db';
import { processUnlocks } from '@/lib/unlock';
import type { Mascot, Profile, Streak } from '@/types';

async function makeProfile(): Promise<Profile> {
  return profiles.upsert({ display_name: 'Felipe' });
}

async function makeMascot(p: Profile, partial: Partial<Mascot> = {}): Promise<Mascot> {
  return mascots.upsert({
    user_id: p.id,
    name: 'Bipo',
    personality: 'calmo',
    xp: 0,
    level: 1,
    phase: 'ovo',
    energy: 80,
    mood: 'ok',
    health: 100,
    ...partial,
  } as any);
}

function fakeStreak(p: Profile, current = 0, longest = current): Streak {
  return {
    user_id: p.id,
    current_streak: current,
    longest_streak: longest,
    last_active_date: null,
    grace_days_left: 2,
    updated_at: new Date().toISOString(),
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('processUnlocks — achievements', () => {
  it('1 check-in → primeiro-passo unlocked', async () => {
    const p = await makeProfile();
    const m = await makeMascot(p);
    await checkins.add({
      user_id: p.id,
      habit_kind: 'water',
      value: 1,
      unit: 'cups',
      occurred_on: '2026-05-18',
      occurred_at: new Date().toISOString(),
      xp_awarded: 10,
      idempotency_key: 'k1',
    });
    const r = await processUnlocks(p, m, fakeStreak(p));
    expect(r.achievements.find(a => a.id === 'primeiro-passo')).toBeTruthy();
    const persisted = await achievements.listUnlocked(p.id);
    expect(persisted.some(a => a.achievement_id === 'primeiro-passo')).toBe(true);
  });

  it('NÃO duplica achievement já unlocked', async () => {
    const p = await makeProfile();
    const m = await makeMascot(p);
    await achievements.unlock(p.id, 'primeiro-passo');
    await checkins.add({
      user_id: p.id, habit_kind: 'water', value: 1, unit: 'cups',
      occurred_on: '2026-05-18', occurred_at: new Date().toISOString(),
      xp_awarded: 10, idempotency_key: 'k1',
    });
    const r = await processUnlocks(p, m, fakeStreak(p));
    expect(r.achievements.find(a => a.id === 'primeiro-passo')).toBeUndefined();
  });
});

describe('processUnlocks — accessories', () => {
  it('level 2 → cap unlocked', async () => {
    const p = await makeProfile();
    const m = await makeMascot(p, { level: 2 });
    const r = await processUnlocks(p, m, fakeStreak(p));
    expect(r.accessories.some(a => a.id === 'cap')).toBe(true);
    const owned = await inventory.listOwned(p.id);
    expect(owned.some(a => a.accessory_id === 'cap')).toBe(true);
  });

  it('streak 7 → scarf unlocked', async () => {
    const p = await makeProfile();
    const m = await makeMascot(p, { level: 1 });
    const r = await processUnlocks(p, m, fakeStreak(p, 7));
    expect(r.accessories.some(a => a.id === 'scarf')).toBe(true);
  });

  it('NÃO desbloqueia accessory já possuído', async () => {
    const p = await makeProfile();
    const m = await makeMascot(p, { level: 2 });
    await inventory.unlock(p.id, 'cap');
    const r = await processUnlocks(p, m, fakeStreak(p));
    expect(r.accessories.some(a => a.id === 'cap')).toBe(false);
  });
});

describe('processUnlocks — scenes', () => {
  it('garante "room" desbloqueada por default', async () => {
    const p = await makeProfile();
    const m = await makeMascot(p);
    await processUnlocks(p, m, fakeStreak(p));
    const list = await userScenes.listUnlocked(p.id);
    expect(list.some(s => s.scene_id === 'room')).toBe(true);
    expect(list.some(s => s.scene_id === 'room' && s.active)).toBe(true);
  });

  it('streak 7 desbloqueia floresta', async () => {
    const p = await makeProfile();
    const m = await makeMascot(p);
    const r = await processUnlocks(p, m, fakeStreak(p, 7));
    expect(r.scenes.some(s => s.id === 'forest')).toBe(true);
  });

  it('level 6 desbloqueia montanha', async () => {
    const p = await makeProfile();
    const m = await makeMascot(p, { level: 6 });
    const r = await processUnlocks(p, m, fakeStreak(p));
    expect(r.scenes.some(s => s.id === 'mountain')).toBe(true);
  });
});

describe('processUnlocks — empty path', () => {
  it('user zero retorna result vazio (mas room default)', async () => {
    const p = await makeProfile();
    const m = await makeMascot(p);
    const r = await processUnlocks(p, m, fakeStreak(p));
    expect(r.achievements).toEqual([]);
    expect(r.accessories).toEqual([]);
    // Room foi unlocked porém NÃO está no result (foi pra "garantir default")
    expect(r.scenes.find(s => s.id === 'room')).toBeUndefined();
  });
});

describe('processUnlocks — missionsCompleted counts', () => {
  it('10 missions completed → achievement missionario', async () => {
    const p = await makeProfile();
    const m = await makeMascot(p);
    for (let i = 0; i < 10; i++) {
      await missions.add({
        user_id: p.id,
        title: `m${i}`,
        description: 'd',
        habit_kind: 'water',
        target_value: 1,
        xp_reward: 10,
        status: 'completed',
        scheduled_for: '2026-05-18',
        completed_at: new Date().toISOString(),
      });
    }
    const r = await processUnlocks(p, m, fakeStreak(p));
    expect(r.achievements.some(a => a.id === 'missionario')).toBe(true);
  });
});

describe('processUnlocks — habit variety', () => {
  it('5 habit kinds → variedade achievement', async () => {
    const p = await makeProfile();
    const m = await makeMascot(p);
    const kinds = ['water', 'sleep', 'exercise', 'meditation', 'reading'] as const;
    for (const k of kinds) {
      await checkins.add({
        user_id: p.id, habit_kind: k, value: 1, unit: 'x',
        occurred_on: '2026-05-18', occurred_at: new Date().toISOString(),
        xp_awarded: 10, idempotency_key: `k-${k}`,
      });
    }
    const r = await processUnlocks(p, m, fakeStreak(p));
    expect(r.achievements.some(a => a.id === 'variedade')).toBe(true);
  });
});
