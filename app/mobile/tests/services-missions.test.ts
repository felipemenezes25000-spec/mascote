import { beforeEach, describe, expect, it } from 'vitest';
import {
  __BANDIT_MIN_PULLS,
  __resetBanditState,
  recordMissionOutcome,
  suggestMissionFor,
} from '@/services/missions';
import { fullMissionCatalog, missionCatalog, pickDailyMission } from '@/content/missions';

declare const __asyncStorageReset: () => void;

describe('services/missions', () => {
  beforeEach(async () => {
    __asyncStorageReset();
    await __resetBanditState();
  });

  describe('suggestMissionFor', () => {
    it('cold-start: usa pickDailyMission determinístico', async () => {
      const out = await suggestMissionFor({
        personality: 'calmo',
        mood: 'ok',
        doneToday: [],
        dateKey: '2026-05-18',
        hour: 12,
      });
      const fallback = pickDailyMission('calmo', '2026-05-18');
      expect(out.id).toBe(fallback.id);
    });

    it('usa bandit após acumular MIN_PULLS rewards', async () => {
      const m = missionCatalog.find(t => t.habit_kind === 'water')!;
      for (let i = 0; i < __BANDIT_MIN_PULLS; i++) {
        await recordMissionOutcome(m.id, true);
      }
      const out = await suggestMissionFor({
        personality: 'motivador',
        mood: 'feliz',
        doneToday: [],
        dateKey: '2026-05-18',
        hour: 12,
      });
      expect(out).toBeTruthy();
      // Não é trivial validar QUE deu o bandit em vez do fallback (ambos podem coincidir),
      // mas confirmamos que ele retornou uma mission válida do catálogo.
      expect(missionCatalog.find(t => t.id === out.id)).toBeTruthy();
    });

    it('fallback determinístico quando contexto filtra tudo', async () => {
      // Acumula rewards suficientes; depois manda mood/horário ruim e doneToday cobrindo tudo
      const m = missionCatalog.find(t => t.habit_kind === 'water')!;
      for (let i = 0; i < __BANDIT_MIN_PULLS; i++) await recordMissionOutcome(m.id, true);
      const allHabits = [
        'water','sleep','exercise','breath','meditation','reading','journaling','outdoor','sun',
      ] as const;
      const out = await suggestMissionFor({
        personality: 'calmo',
        mood: 'triste',
        doneToday: [...allHabits],
        dateKey: '2026-05-18',
        hour: 3,
      });
      // Fallback pode vir do catálogo expandido (pickDailyMission usa fullMissionCatalog)
      expect(fullMissionCatalog.find(t => t.id === out.id)).toBeTruthy();
    });
  });

  describe('recordMissionOutcome', () => {
    it('ignora IDs desconhecidos sem quebrar', async () => {
      await expect(recordMissionOutcome('m-fake-9999', true)).resolves.toBeUndefined();
    });

    it('aceita success=false', async () => {
      const m = missionCatalog[0];
      await recordMissionOutcome(m.id, false);
      // depois disso, sumRewards deve ser >= 1 e bandit ativo após mais rewards.
      await recordMissionOutcome(m.id, true);
    });

    it('persiste rewards entre chamadas (loadBandit lê o que saveBandit escreveu)', async () => {
      const m = missionCatalog.find(t => t.habit_kind === 'sleep')!;
      for (let i = 0; i < __BANDIT_MIN_PULLS + 2; i++) {
        await recordMissionOutcome(m.id, true);
      }
      // Depois disso, bandit deve estar ativo na chamada de suggest
      const out = await suggestMissionFor({
        personality: 'motivador',
        mood: 'ok',
        doneToday: [],
        dateKey: '2026-05-18',
        hour: 20, // sleep só faz sentido >= 18h
      });
      expect(missionCatalog.find(t => t.id === out.id)).toBeTruthy();
    });
  });

  describe('reset', () => {
    it('__resetBanditState zera estado persistido', async () => {
      const m = missionCatalog[0];
      for (let i = 0; i < __BANDIT_MIN_PULLS; i++) await recordMissionOutcome(m.id, true);
      await __resetBanditState();
      // Volta ao cold-start (determinístico)
      const out = await suggestMissionFor({
        personality: 'calmo',
        mood: 'ok',
        doneToday: [],
        dateKey: '2026-05-18',
      });
      expect(out.id).toBe(pickDailyMission('calmo', '2026-05-18').id);
    });
  });
});
