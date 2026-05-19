import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkins as checkinsDb,
  combo,
  dailyReward,
  inventory,
  mascots,
  missions,
  mysteryBox,
  profiles,
  resetAll,
  todayLocal,
  userScenes,
  wallet,
  xpEvents,
} from '@/lib/db';
import { completeMissionForToday, doCheckin, loadHomeState } from '@/services/home';
import type { Mission } from '@/types';

declare const __asyncStorageReset: () => void;

async function setupUser() {
  const profile = await profiles.upsert({ display_name: 'Test', age_band: '25-34' });
  const mascot = await mascots.upsert({
    user_id: profile.id,
    name: 'Robo',
    personality: 'calmo',
    phase: 'bebe',
    mood: 'feliz',
    energy: 80,
  });
  return { profile, mascot };
}

describe('services/home', () => {
  beforeEach(async () => {
    __asyncStorageReset();
    await resetAll();
  });

  describe('loadHomeState', () => {
    it('retorna bootstrap consistente após user fresh', async () => {
      const { profile } = await setupUser();
      const state = await loadHomeState(profile);
      expect(state.todayCheckins).toEqual({});
      expect(state.mission).toBeNull();
      expect(state.comboLevel).toBe(1);
      expect(state.dailyCurrentDay).toBe(1);
      expect(state.dailyClaimedToday).toBe(false);
      expect(state.boxAvailable).toBe(true);
      expect(state.totalCheckinsAll).toBe(0);
      expect(state.activeSceneId).toBe('room');
      expect(state.equippedAccessoryId).toBe('none');
    });

    it('agrega todayCheckins por habit_kind', async () => {
      const { profile } = await setupUser();
      const today = todayLocal();
      await checkinsDb.add({
        user_id: profile.id,
        habit_kind: 'water',
        value: 1,
        unit: 'copo',
        occurred_on: today,
        occurred_at: new Date().toISOString(),
        xp_awarded: 10,
        idempotency_key: 'a',
      });
      await checkinsDb.add({
        user_id: profile.id,
        habit_kind: 'water',
        value: 1,
        unit: 'copo',
        occurred_on: today,
        occurred_at: new Date().toISOString(),
        xp_awarded: 10,
        idempotency_key: 'b',
      });
      const state = await loadHomeState(profile);
      expect(state.todayCheckins.water).toBe(2);
      expect(state.totalCheckinsAll).toBe(2);
    });

    it('mission pending tem prioridade sobre completed/expired', async () => {
      const { profile } = await setupUser();
      const today = todayLocal();
      await missions.add({
        user_id: profile.id,
        title: 'M1',
        description: '',
        habit_kind: 'water',
        target_value: 1,
        xp_reward: 10,
        status: 'completed',
        scheduled_for: today,
        completed_at: new Date().toISOString(),
      });
      await missions.add({
        user_id: profile.id,
        title: 'M2',
        description: '',
        habit_kind: 'sleep',
        target_value: null,
        xp_reward: 25,
        status: 'pending',
        scheduled_for: today,
        completed_at: null,
      });
      const state = await loadHomeState(profile);
      expect(state.mission?.title).toBe('M2');
    });

    it('clamp comboLevel em [1, 5]', async () => {
      const { profile } = await setupUser();
      // bump 6 vezes; cap em 5
      for (let i = 0; i < 8; i++) await combo.bump(profile.id);
      const state = await loadHomeState(profile);
      expect(state.comboLevel).toBeLessThanOrEqual(5);
      expect(state.comboLevel).toBeGreaterThanOrEqual(1);
    });

    it('boxAvailable=false após abrir hoje', async () => {
      const { profile } = await setupUser();
      const today = todayLocal();
      await mysteryBox.open(profile.id, today);
      const state = await loadHomeState(profile);
      expect(state.boxAvailable).toBe(false);
    });
  });

  describe('doCheckin', () => {
    it('aplica checkin completo via pipeline', async () => {
      const { profile, mascot } = await setupUser();
      const outcome = await doCheckin(profile, mascot, 'water', 1);
      expect(outcome.mascot.xp).toBeGreaterThan(mascot.xp);
      expect(outcome.xpGained).toBeGreaterThan(0);
    });
  });

  describe('completeMissionForToday', () => {
    it('atualiza mascote XP e wallet ao completar', async () => {
      const { profile, mascot } = await setupUser();
      const today = todayLocal();
      const m = await missions.add({
        user_id: profile.id,
        title: 'M',
        description: '',
        habit_kind: 'water',
        target_value: 1,
        xp_reward: 20,
        status: 'pending',
        scheduled_for: today,
        completed_at: null,
      });
      const result = await completeMissionForToday(profile, mascot, m, 15);
      expect(result.alreadyCompleted).toBe(false);
      expect(result.xpGained).toBe(20);
      expect(result.coins).toBe(15);
      expect(result.mascot.xp).toBe(mascot.xp + 20);

      const w = await wallet.get(profile.id);
      expect(w.coins).toBeGreaterThanOrEqual(15);
    });

    it('é idempotente se missão já está completed', async () => {
      const { profile, mascot } = await setupUser();
      const today = todayLocal();
      const m: Mission = await missions.add({
        user_id: profile.id,
        title: 'M',
        description: '',
        habit_kind: 'water',
        target_value: 1,
        xp_reward: 20,
        status: 'completed',
        scheduled_for: today,
        completed_at: new Date().toISOString(),
      });
      const result = await completeMissionForToday(profile, mascot, m, 15);
      expect(result.alreadyCompleted).toBe(true);
      expect(result.xpGained).toBe(0);
      expect(result.coins).toBe(0);
    });
  });
});
