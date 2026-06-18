/**
 * Teto DIÁRIO do drift por chat — só as primeiras N mensagens/dia driftam o
 * genoma (anti-gaming, mantém o processo lento). Persistência local por dia.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CHAT_DRIFT_DAILY_CAP,
  tryConsumeChatDriftBudget,
} from '@/lib/dna/chatDriftBudget';

const KEY = 'mascote:chat_drift_day';

beforeEach(async () => {
  await AsyncStorage.removeItem(KEY);
});

describe('chatDriftBudget', () => {
  it('consome até o teto e depois bloqueia no mesmo dia', async () => {
    const now = Date.UTC(2026, 5, 18, 12);
    for (let i = 0; i < CHAT_DRIFT_DAILY_CAP; i++) {
      expect(await tryConsumeChatDriftBudget(now)).toBe(true);
    }
    expect(await tryConsumeChatDriftBudget(now)).toBe(false);
    expect(await tryConsumeChatDriftBudget(now)).toBe(false);
  });

  it('novo dia reseta o teto', async () => {
    const day1 = Date.UTC(2026, 5, 18, 12);
    const day2 = Date.UTC(2026, 5, 19, 12);
    for (let i = 0; i < CHAT_DRIFT_DAILY_CAP; i++) await tryConsumeChatDriftBudget(day1);
    expect(await tryConsumeChatDriftBudget(day1)).toBe(false);
    // vira o dia → libera de novo
    expect(await tryConsumeChatDriftBudget(day2)).toBe(true);
  });

  it('valor corrompido em storage → trata como dia novo (self-heal)', async () => {
    await AsyncStorage.setItem(KEY, 'not-json');
    expect(await tryConsumeChatDriftBudget(Date.UTC(2026, 5, 18, 12))).toBe(true);
  });

  it('CHAT_DRIFT_DAILY_CAP é um número positivo razoável', () => {
    expect(CHAT_DRIFT_DAILY_CAP).toBeGreaterThan(0);
    expect(CHAT_DRIFT_DAILY_CAP).toBeLessThanOrEqual(20);
  });
});
