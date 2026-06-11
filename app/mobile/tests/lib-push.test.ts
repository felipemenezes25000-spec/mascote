/**
 * Notificações LOCAIS de sistema (src/lib/push.ts).
 *
 * Invariantes críticos:
 * - Respeita as MESMAS regras de consentimento do notify.ts in-app:
 *   push_enabled, paused_until futuro e quiet hours.
 * - Web é no-op total (nenhuma chamada ao expo-notifications).
 * - Permissão negada → no-op silencioso, sem nag (não re-pede após denied).
 * - Sync é idempotente: cancela tudo antes de re-agendar.
 * - Nudge da jornada só com progresso ≥ 0.8 (antecipação factual, não fabricada).
 * - Exceções do expo-notifications nunca propagam (boot jamais quebra).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  buildDailyReminderContent,
  buildJourneyNudge,
  pickDailyReminderSlot,
  syncPushSchedules,
} from '@/lib/push';
import { JOURNEY_PHASES } from '@/game/journey';
import { logger } from '@/lib/logger';
import type { Mascot, Profile, Settings } from '@/types';

vi.mock('expo-notifications', () => ({
  scheduleNotificationAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  AndroidImportance: { DEFAULT: 3 },
}));

const scheduleMock = vi.mocked(Notifications.scheduleNotificationAsync);
const cancelAllMock = vi.mocked(Notifications.cancelAllScheduledNotificationsAsync);
const getPermsMock = vi.mocked(Notifications.getPermissionsAsync);
const requestPermsMock = vi.mocked(Notifications.requestPermissionsAsync);
const setChannelMock = vi.mocked(Notifications.setNotificationChannelAsync);

type PermLike = { granted: boolean; status: string; canAskAgain: boolean };
const perm = (granted: boolean, status: string): PermLike => ({
  granted,
  status,
  canAskAgain: true,
});

// ============= fixtures =============

const profile: Profile = {
  id: 'u1',
  display_name: 'Felipe',
  age_band: null,
  timezone: 'America/Sao_Paulo',
  locale: 'pt-BR',
  created_at: '2026-01-01T00:00:00.000Z',
};

function makeMascot(xp: number): Mascot {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Bipo',
    personality: 'calmo',
    phase: 'ovo',
    mood: 'ok',
    xp,
    level: 1,
    energy: 80,
    health: 100,
    last_seen_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function makeSettings(patch?: Partial<Settings>): Settings {
  return {
    user_id: 'u1',
    theme_mode: 'system',
    brand_palette: 'classic',
    dynamic_text: true,
    reduce_motion: false,
    high_contrast: false,
    push_enabled: true,
    quiet_start: '22:00',
    quiet_end: '08:00',
    paused_until: null,
    language: 'pt-BR',
    consent_analytics: false,
    tour_completed: false,
    ...patch,
  };
}

/** XP a 1 ponto da fase 2 → progress ≈ 1 (≥ 0.8 garantido com threshold ≥ 5). */
const XP_QUASE_FASE_2 = JOURNEY_PHASES[1].xp - 1;

/** Data local YYYY-MM-DD com offset de dias — pra montar paused_until. */
function localDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  // setup.ts mocka react-native com Platform.OS='web' — sobrescrevemos pra
  // exercitar o caminho nativo (cada arquivo de teste tem registry isolado).
  (Platform as { OS: string }).OS = 'ios';
  getPermsMock.mockResolvedValue(perm(true, 'granted') as never);
  requestPermsMock.mockResolvedValue(perm(true, 'granted') as never);
  scheduleMock.mockResolvedValue('mock-id');
  cancelAllMock.mockResolvedValue(undefined);
  setChannelMock.mockResolvedValue(null);
});

// ============================================================================
// Helpers puros
// ============================================================================

describe('pickDailyReminderSlot', () => {
  it('mantém 19:30 quando fora da quiet window padrão (22:00–08:00)', () => {
    expect(pickDailyReminderSlot('22:00', '08:00')).toEqual({ hour: 19, minute: 30 });
  });

  it('desvia pra primeira meia-hora fora da janela a partir das 18:00', () => {
    // 19:30 dentro de 19:00–21:00 → 18:00 já está fora.
    expect(pickDailyReminderSlot('19:00', '21:00')).toEqual({ hour: 18, minute: 0 });
    // 19:30 dentro de 18:00–20:00 → primeira fora é 20:00.
    expect(pickDailyReminderSlot('18:00', '20:00')).toEqual({ hour: 20, minute: 0 });
  });

  it('lida com crossover de meia-noite na quiet window', () => {
    // 19:00–07:00 cobre 19:30 → 18:00 está fora.
    expect(pickDailyReminderSlot('19:00', '07:00')).toEqual({ hour: 18, minute: 0 });
    // 17:00–02:00 cobre tudo de 18:00 até 01:30 → wrap até 02:00.
    expect(pickDailyReminderSlot('17:00', '02:00')).toEqual({ hour: 2, minute: 0 });
  });

  it('normaliza horários sem zero à esquerda ("9:00")', () => {
    // 9:00–21:00 cobre 19:30 → primeira fora após 18:00 é 21:00.
    expect(pickDailyReminderSlot('9:00', '21:00')).toEqual({ hour: 21, minute: 0 });
  });

  it('janela degenerada (start === end) não silencia nada — mantém 19:30', () => {
    expect(pickDailyReminderSlot('20:00', '20:00')).toEqual({ hour: 19, minute: 30 });
  });
});

describe('buildDailyReminderContent', () => {
  it('usa o nome do mascote num convite leve, sem culpa', () => {
    const c = buildDailyReminderContent('Bipo');
    expect(c.title).toBe('Bipo pensou em você 💛');
    expect(c.body).toContain('Sem pressa');
    // Guard de copy ética: nada de urgência falsa ou sofrimento.
    expect(`${c.title} ${c.body}`.toLowerCase()).not.toMatch(/sofrendo|urgente|agora ou|última chance/);
  });

  it('tem fallback pra nome vazio', () => {
    expect(buildDailyReminderContent('  ').title).toContain('Seu Mascote');
  });
});

describe('buildJourneyNudge', () => {
  it('retorna null longe da próxima fase (progresso < 0.8)', () => {
    expect(buildJourneyNudge(0)).toBeNull();
  });

  it('retorna template ético quando progresso ≥ 0.8', () => {
    const nudge = buildJourneyNudge(XP_QUASE_FASE_2);
    expect(nudge).not.toBeNull();
    // Conforme reward.kind da fase 2: baú → chestWaiting, senão phaseClose.
    if (JOURNEY_PHASES[1].reward.kind === 'chest') {
      expect(nudge!.title).toContain('baú');
    } else {
      expect(nudge!.title).toContain('quase evoluindo');
      expect(nudge!.body).toContain(JOURNEY_PHASES[1].title);
    }
  });

  it('retorna null no fim da jornada (sem nextPhase)', () => {
    const lastXp = JOURNEY_PHASES[JOURNEY_PHASES.length - 1].xp + 10_000;
    expect(buildJourneyNudge(lastXp)).toBeNull();
  });
});

// ============================================================================
// syncPushSchedules
// ============================================================================

describe('syncPushSchedules — consentimento', () => {
  it('push_enabled=false → cancela tudo e não agenda nada', async () => {
    await syncPushSchedules(profile, makeMascot(0), makeSettings({ push_enabled: false }));
    expect(cancelAllMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock).not.toHaveBeenCalled();
    expect(getPermsMock).not.toHaveBeenCalled();
  });

  it('paused_until futuro → cancela tudo e não agenda nada', async () => {
    await syncPushSchedules(
      profile,
      makeMascot(0),
      makeSettings({ paused_until: localDateOffset(3) })
    );
    expect(cancelAllMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('paused_until no passado NÃO bloqueia o agendamento', async () => {
    await syncPushSchedules(
      profile,
      makeMascot(0),
      makeSettings({ paused_until: localDateOffset(-3) })
    );
    expect(scheduleMock).toHaveBeenCalledTimes(1);
  });

  it('web → no-op total (nenhuma chamada ao expo-notifications)', async () => {
    (Platform as { OS: string }).OS = 'web';
    await syncPushSchedules(profile, makeMascot(0), makeSettings());
    expect(cancelAllMock).not.toHaveBeenCalled();
    expect(scheduleMock).not.toHaveBeenCalled();
    expect(getPermsMock).not.toHaveBeenCalled();
  });
});

describe('syncPushSchedules — permissão do OS', () => {
  it('pede permissão na primeira vez (undetermined) e agenda se concedida', async () => {
    getPermsMock.mockResolvedValue(perm(false, 'undetermined') as never);
    requestPermsMock.mockResolvedValue(perm(true, 'granted') as never);
    await syncPushSchedules(profile, makeMascot(0), makeSettings());
    expect(requestPermsMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock).toHaveBeenCalledTimes(1);
  });

  it('permissão negada no pedido → no-op silencioso, sem throw', async () => {
    getPermsMock.mockResolvedValue(perm(false, 'undetermined') as never);
    requestPermsMock.mockResolvedValue(perm(false, 'denied') as never);
    await expect(
      syncPushSchedules(profile, makeMascot(0), makeSettings())
    ).resolves.toBeUndefined();
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('já negada antes (denied) → não re-pede — sem nag a cada boot', async () => {
    getPermsMock.mockResolvedValue(perm(false, 'denied') as never);
    await syncPushSchedules(profile, makeMascot(0), makeSettings());
    expect(requestPermsMock).not.toHaveBeenCalled();
    expect(scheduleMock).not.toHaveBeenCalled();
  });
});

describe('syncPushSchedules — agendamento', () => {
  it('agenda lembrete diário 19:30 repetindo, com nome do mascote', async () => {
    await syncPushSchedules(profile, makeMascot(0), makeSettings());
    // Idempotência: cancela tudo ANTES de agendar.
    expect(cancelAllMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock).toHaveBeenCalledTimes(1);
    const call = scheduleMock.mock.calls[0][0];
    expect(call.content.title).toBe('Bipo pensou em você 💛');
    expect(call.trigger).toMatchObject({ hour: 19, minute: 30, repeats: true });
  });

  it('desvia o diário da quiet window do usuário', async () => {
    await syncPushSchedules(
      profile,
      makeMascot(0),
      makeSettings({ quiet_start: '19:00', quiet_end: '21:00' })
    );
    const call = scheduleMock.mock.calls[0][0];
    expect(call.trigger).toMatchObject({ hour: 18, minute: 0, repeats: true });
  });

  it('agenda diário + nudge one-shot quando progresso ≥ 0.8', async () => {
    await syncPushSchedules(profile, makeMascot(XP_QUASE_FASE_2), makeSettings());
    expect(scheduleMock).toHaveBeenCalledTimes(2);
    const nudgeCall = scheduleMock.mock.calls[1][0];
    const trigger = nudgeCall.trigger as { date: Date };
    expect(trigger.date).toBeInstanceOf(Date);
    // Amanhã ao meio-dia local.
    expect(trigger.date.getHours()).toBe(12);
    expect(trigger.date.getTime()).toBeGreaterThan(Date.now());
  });

  it('NÃO agenda nudge longe da próxima fase', async () => {
    await syncPushSchedules(profile, makeMascot(0), makeSettings());
    expect(scheduleMock).toHaveBeenCalledTimes(1);
  });

  it('Android: cria channel "cuidado" com importance DEFAULT e usa no trigger', async () => {
    (Platform as { OS: string }).OS = 'android';
    await syncPushSchedules(profile, makeMascot(0), makeSettings());
    expect(setChannelMock).toHaveBeenCalledWith(
      'cuidado',
      expect.objectContaining({ importance: 3 })
    );
    const call = scheduleMock.mock.calls[0][0];
    expect(call.trigger).toMatchObject({ channelId: 'cuidado' });
  });

  it('iOS: não cria channel Android', async () => {
    await syncPushSchedules(profile, makeMascot(0), makeSettings());
    expect(setChannelMock).not.toHaveBeenCalled();
  });
});

describe('syncPushSchedules — resiliência', () => {
  it('exceção do expo-notifications não propaga (boot nunca quebra)', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    scheduleMock.mockRejectedValue(new Error('Expo Go sem suporte'));
    await expect(
      syncPushSchedules(profile, makeMascot(0), makeSettings())
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('exceção no cancelAll do caminho de opt-out também não propaga', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    cancelAllMock.mockRejectedValue(new Error('boom'));
    await expect(
      syncPushSchedules(profile, makeMascot(0), makeSettings({ push_enabled: false }))
    ).resolves.toBeUndefined();
    warnSpy.mockRestore();
  });
});
