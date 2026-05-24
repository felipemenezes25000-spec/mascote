/**
 * Tests adicionais pra src/lib/proactive.ts — cobre todos os triggers.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildProactiveContext,
  runProactiveScan,
  type ProactiveContext,
} from '@/lib/proactive';
import { rememberExplicit } from '@/lib/memory';
import {
  addDays,
  checkins as checkinsDb,
  messages as messagesDb,
  profiles,
  resetAll,
  settings as settingsDb,
  todayLocal,
} from '@/lib/db';
import type { Profile } from '@/types';

declare const __asyncStorageReset: () => void;

async function setupUser(): Promise<Profile> {
  const profile = await profiles.upsert({ display_name: 'Test', age_band: '25-34' });
  // Desabilita quiet hours pra notify não bloquear nos testes (a janela default
  // 22:00→08:00 cobre a maior parte do tempo em fuso BR durante a noite).
  await settingsDb.update(profile.id, { quiet_start: '00:00', quiet_end: '00:00' });
  return profile;
}

function ctx(overrides: Partial<ProactiveContext> & { profile: Profile }): ProactiveContext {
  return {
    recentCheckins: [],
    recentUserMessages: [],
    lastChatAt: null,
    mascotName: 'Robo',
    ...overrides,
  };
}

describe('proactive: runProactiveScan triggers', () => {
  beforeEach(async () => {
    __asyncStorageReset();
    await resetAll();
  });

  it('no_water_3d dispara quando último water foi >= 3 dias atrás', async () => {
    const profile = await setupUser();
    const oldDay = addDays(todayLocal(), -4);
    const { fired } = await runProactiveScan(
      ctx({
        profile,
        recentCheckins: [
          {
            id: 'c1', user_id: profile.id, habit_kind: 'water', value: 1, unit: null,
            occurred_on: oldDay, occurred_at: oldDay + 'T08:00:00.000Z', xp_awarded: 10,
            idempotency_key: 'a', created_at: oldDay + 'T08:00:00.000Z',
          },
        ],
      })
    );
    expect(fired).toContain('no_water_3d');
  });

  it('no_water_3d NÃO dispara quando water recente', async () => {
    const profile = await setupUser();
    const { fired } = await runProactiveScan(
      ctx({
        profile,
        recentCheckins: [
          {
            id: 'c1', user_id: profile.id, habit_kind: 'water', value: 1, unit: null,
            occurred_on: todayLocal(), occurred_at: todayLocal() + 'T08:00:00.000Z',
            xp_awarded: 10, idempotency_key: 'a',
            created_at: todayLocal() + 'T08:00:00.000Z',
          },
        ],
      })
    );
    expect(fired).not.toContain('no_water_3d');
  });

  it('low_sleep_pattern dispara com 3+ sleeps curtos na semana', async () => {
    const profile = await setupUser();
    const today = todayLocal();
    const { fired } = await runProactiveScan(
      ctx({
        profile,
        recentCheckins: [-1, -2, -3].map(offset => {
          const d = addDays(today, offset);
          return {
            id: 'c' + offset, user_id: profile.id, habit_kind: 'sleep' as const,
            value: 4.5, unit: 'h', occurred_on: d,
            occurred_at: d + 'T08:00:00.000Z', xp_awarded: 10,
            idempotency_key: 's' + offset, created_at: d + 'T08:00:00.000Z',
          };
        }),
      })
    );
    expect(fired).toContain('low_sleep_pattern');
  });

  it('quiet_chat_7d dispara após 7d sem chat', async () => {
    const profile = await setupUser();
    const oldIso = new Date(Date.now() - 8 * 86_400_000).toISOString();
    const { fired } = await runProactiveScan(
      ctx({ profile, lastChatAt: oldIso })
    );
    expect(fired).toContain('quiet_chat_7d');
  });

  it('quiet_chat_7d NÃO dispara se lastChatAt é null (user nunca conversou)', async () => {
    const profile = await setupUser();
    const { fired } = await runProactiveScan(ctx({ profile, lastChatAt: null }));
    expect(fired).not.toContain('quiet_chat_7d');
  });

  it('quiet_chat_7d NÃO dispara se lastChatAt < 7 dias (cobre linha 147)', async () => {
    const profile = await setupUser();
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const { fired } = await runProactiveScan(ctx({ profile, lastChatAt: recent }));
    expect(fired).not.toContain('quiet_chat_7d');
  });

  it('recent_sad_streak NÃO dispara com 2 tristes + 1 alegre (cobre linha 164)', async () => {
    const profile = await setupUser();
    const { fired } = await runProactiveScan(
      ctx({
        profile,
        recentUserMessages: [
          { content: 'tô triste', created_at: '2026-05-18T08:00:00Z' },
          { content: 'feliz alegria', created_at: '2026-05-18T09:00:00Z' },
          { content: 'tô ansiosa', created_at: '2026-05-18T10:00:00Z' },
        ],
      })
    );
    expect(fired).not.toContain('recent_sad_streak');
  });

  it('recent_sad_streak dispara em 3 mensagens tristes seguidas', async () => {
    const profile = await setupUser();
    const { fired } = await runProactiveScan(
      ctx({
        profile,
        recentUserMessages: [
          { content: 'tô muito triste hoje', created_at: '2026-05-18T08:00:00Z' },
          { content: 'me sinto sozinha', created_at: '2026-05-18T09:00:00Z' },
          { content: 'tô esgotada e sem energia', created_at: '2026-05-18T10:00:00Z' },
        ],
      })
    );
    expect(fired).toContain('recent_sad_streak');
  });

  it('first_week_complete: 7+ dias após criação E 5+ dias com checkin', async () => {
    const oldDate = new Date(Date.now() - 8 * 86_400_000).toISOString();
    const realProfile = await setupUser();
    // Sobrescreve created_at pra simular conta antiga
    const profile: Profile = { ...realProfile, created_at: oldDate };
    const today = todayLocal();
    const { fired } = await runProactiveScan(
      ctx({
        profile,
        recentCheckins: [0, -1, -2, -3, -4].map(offset => {
          const d = addDays(today, offset);
          return {
            id: 'c' + offset, user_id: profile.id, habit_kind: 'water' as const,
            value: 1, unit: 'copo', occurred_on: d,
            occurred_at: d + 'T08:00:00.000Z', xp_awarded: 10,
            idempotency_key: 'k' + offset, created_at: d + 'T08:00:00.000Z',
          };
        }),
      })
    );
    expect(fired).toContain('first_week_complete');
  });

  it('cooldown respeitado: dois scans seguidos disparam só uma vez', async () => {
    const profile = await setupUser();
    const oldIso = new Date(Date.now() - 8 * 86_400_000).toISOString();
    const { fired: fired1 } = await runProactiveScan(ctx({ profile, lastChatAt: oldIso }));
    const { fired: fired2 } = await runProactiveScan(ctx({ profile, lastChatAt: oldIso }));
    expect(fired1).toContain('quiet_chat_7d');
    expect(fired2).not.toContain('quiet_chat_7d');
  });

  it('sim_return_absence usa memória recente como hint de bubble', async () => {
    const profile = await setupUser();
    await rememberExplicit(
      profile.id,
      'Momento de retorno: Faz 4 dias. Sem cobrança — só feliz que voltou.',
      'event',
      new Date(),
    );
    const { bubbleLine, fired } = await runProactiveScan(
      ctx({
        profile,
        lifeState: {
          user_id: profile.id,
          energy: 55,
          mood: 'ok',
          last_simulated_at: new Date().toISOString(),
          absence_hours: 96,
          total_simulated_hours: 96,
        },
      }),
    );
    expect(fired).toContain('sim_return_absence');
    expect(bubbleLine).toContain('Momento de retorno');
  });

  it('sim_living_moment usa memória relevante quando existir', async () => {
    const profile = await setupUser();
    await rememberExplicit(
      profile.id,
      'Momento vivido enquanto estava fora: Dei uma volta curta e respirei fundo.',
      'event',
      new Date(),
    );
    const { bubbleLine, fired } = await runProactiveScan(
      ctx({
        profile,
        simulationEvents: [{
          kind: 'while_away_living_moment',
          at: new Date().toISOString(),
          message: 'Enquanto você estava fora, respirei fundo.',
        }],
      }),
    );
    expect(fired).toContain('sim_living_moment');
    expect(bubbleLine).toContain('Momento vivido enquanto estava fora');
  });

  it('sim_habit_missed usa memória recente de hábito perdido', async () => {
    const profile = await setupUser();
    await rememberExplicit(
      profile.id,
      'Ritmo percebido na sua ausência: Água ficou para depois por alguns dias.',
      'event',
      new Date(),
    );
    const { bubbleLine, fired } = await runProactiveScan(
      ctx({
        profile,
        simulationEvents: [{
          kind: 'while_away_habit_missed',
          at: new Date().toISOString(),
          message: 'Água ficou para depois por alguns dias.',
        }],
      }),
    );
    expect(fired).toContain('sim_habit_missed');
    expect(bubbleLine).toContain('Água ficou para depois');
  });
});

describe('proactive: buildProactiveContext', () => {
  beforeEach(async () => {
    __asyncStorageReset();
    await resetAll();
  });

  it('lê últimos 14 dias de checkins, últimas 10 mensagens user, lastChatAt', async () => {
    const profile = await setupUser();
    const today = todayLocal();
    await checkinsDb.add({
      user_id: profile.id, habit_kind: 'water', value: 1, unit: 'copo',
      occurred_on: today, occurred_at: today + 'T08:00:00.000Z', xp_awarded: 10,
      idempotency_key: 'a',
    });
    // messages.listAll filtra por conversation_id === user_id (ver db.ts:387).
    await messagesDb.add({
      conversation_id: profile.id, role: 'user', content: 'oi',
      safety_flag: 'safe', cached: false,
    });
    await messagesDb.add({
      conversation_id: profile.id, role: 'mascot', content: 'oi de volta',
      safety_flag: 'safe', cached: false,
    });
    const c = await buildProactiveContext(profile, 'Robo');
    expect(c.recentCheckins.length).toBe(1);
    expect(c.recentUserMessages.length).toBe(1);
    expect(c.lastChatAt).toBeTruthy();
    expect(c.mascotName).toBe('Robo');
  });

  it('lastChatAt null quando não há mensagens', async () => {
    const profile = await setupUser();
    const c = await buildProactiveContext(profile, 'X');
    expect(c.lastChatAt).toBeNull();
  });
});
