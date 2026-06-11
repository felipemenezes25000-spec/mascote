import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { JOURNEY_NOTIFICATIONS } from '@/content/journey-copy';
import { journeyProgress } from '@/game/journey';
import { dateLocal, todayLocal } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Mascot, Profile, Settings } from '@/types';

/**
 * Notificações LOCAIS de sistema (OS-level) — chegam com o app fechado.
 *
 * Camada-irmã do notify.ts (in-app): respeita EXATAMENTE as mesmas regras de
 * consentimento — push_enabled, paused_until e quiet hours. A diferença é o
 * canal: aqui agendamos no OS via expo-notifications em vez de gravar no
 * banco local.
 *
 * Escopo deliberado: app é local-first, então só local notifications —
 * remote push (tokens/backend) NÃO existe aqui.
 *
 * Design: `syncPushSchedules` é idempotente (cancela tudo e re-agenda do
 * zero), então pode ser chamada no boot e sempre que settings/XP mudarem
 * sem acumular agendamentos duplicados.
 */

/** Canal Android — importance DEFAULT, sem som custom: é convite, não alarme. */
const CARE_CHANNEL_ID = 'cuidado';

/** Horário padrão do lembrete diário (19:30 local). */
const DAILY_REMINDER = { hour: 19, minute: 30 } as const;

// ============================================================================
// Helpers puros (exportados pra teste)
// ============================================================================

/** Aceita "9:00" e converte pra "09:00" — paridade com notify.ts. */
function normalizeHM(hm: string): string {
  if (!/^\d{1,2}:\d{2}$/.test(hm)) return hm;
  const [h, m] = hm.split(':');
  return `${h.padStart(2, '0')}:${m}`;
}

/** Mesma semântica da janela de silêncio do notify.ts (crossover incluso). */
function isInQuietWindow(now: string, start: string, end: string): boolean {
  if (start === end) return false;
  if (start <= end) {
    return now >= start && now < end;
  }
  // crossover meia-noite
  return now >= start || now < end;
}

/** Aceita ISO datetime ou date string; devolve YYYY-MM-DD local — paridade com notify.ts. */
function pausedDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return dateLocal(d);
}

/**
 * Slot do lembrete diário: 19:30 por padrão. Se 19:30 cair DENTRO da quiet
 * window do usuário, escolhe a primeira meia-hora FORA da janela a partir
 * das 18:00 (varre em passos de 30min, com wrap pela meia-noite).
 */
export function pickDailyReminderSlot(
  quietStart: string,
  quietEnd: string
): { hour: number; minute: number } {
  const start = normalizeHM(quietStart);
  const end = normalizeHM(quietEnd);
  if (!isInQuietWindow('19:30', start, end)) {
    return { ...DAILY_REMINDER };
  }
  // 19:30 cai no silêncio — varre meias-horas a partir das 18:00.
  let minutes = 18 * 60;
  for (let i = 0; i < 48; i++) {
    const hour = Math.floor(minutes / 60) % 24;
    const minute = minutes % 60;
    const hm = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    if (!isInQuietWindow(hm, start, end)) return { hour, minute };
    minutes += 30;
  }
  // Janela degenerada cobrindo o dia inteiro — mantém o padrão.
  return { ...DAILY_REMINDER };
}

/** Copy acolhedora do lembrete diário — convite leve, zero culpa. */
export function buildDailyReminderContent(mascotName: string): { title: string; body: string } {
  const nome = mascotName.trim() || 'Seu Mascote';
  return {
    title: `${nome} pensou em você 💛`,
    body: 'Um check-in curtinho mantém o ritmo de vocês. Sem pressa.',
  };
}

/**
 * Nudge da jornada — só quando o "quase lá" é FATO (progresso ≥ 80% e existe
 * próxima fase). Usa os templates éticos prontos de journey-copy.ts.
 */
export function buildJourneyNudge(xp: number): { title: string; body: string } | null {
  const prog = journeyProgress(xp);
  if (!prog.nextPhase || prog.progress < 0.8) return null;
  const remaining = prog.xpNeededForNext - prog.xpIntoPhase;
  return prog.nextPhase.reward.kind === 'chest'
    ? JOURNEY_NOTIFICATIONS.chestWaiting()
    : JOURNEY_NOTIFICATIONS.phaseClose(remaining, prog.nextPhase.title);
}

// ============================================================================
// Sync principal
// ============================================================================

/**
 * Sincroniza os agendamentos OS-level com o estado atual do usuário.
 * Idempotente: cancela tudo e re-agenda. Chamada no boot (e re-disparada
 * pelo efeito do _layout quando profile/mascot/settings mudam).
 *
 * Nunca lança — notificação é acessório, jamais derruba o boot.
 */
export async function syncPushSchedules(
  profile: Profile,
  mascot: Mascot,
  settings: Settings
): Promise<void> {
  // Web não tem agendamento OS-level — no-op.
  if (Platform.OS === 'web') return;

  try {
    // Consentimento espelha a camada in-app (notify.ts): opt-out global ou
    // pause futuro derruba TUDO que estava agendado e não agenda nada novo.
    const paused =
      settings.paused_until !== null && pausedDate(settings.paused_until) > todayLocal();
    if (!settings.push_enabled || paused) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    // Permissão do OS: pede UMA vez (status indeterminado). Se o usuário já
    // negou, respeitamos em silêncio — nada de nag a cada boot.
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    // Cast: PermissionStatus é string enum do expo-modules-core (não
    // re-exportado por expo-notifications) — comparamos pelo valor.
    if (!granted && (current.status as string) === 'undetermined') {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return;

    // Android exige channel pra notificação aparecer.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CARE_CHANNEL_ID, {
        name: 'Cuidado',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // Idempotência: derruba agendamentos antigos antes de recriar.
    await Notifications.cancelAllScheduledNotificationsAsync();

    // (a) Lembrete diário de cuidado — 19:30 local, desviando da quiet window.
    const slot = pickDailyReminderSlot(settings.quiet_start, settings.quiet_end);
    const daily = buildDailyReminderContent(mascot.name);
    await Notifications.scheduleNotificationAsync({
      content: { title: daily.title, body: daily.body },
      trigger: { hour: slot.hour, minute: slot.minute, repeats: true, channelId: CARE_CHANNEL_ID },
    });

    // (b) Nudge one-shot da jornada — amanhã ao meio-dia, só com progresso ≥ 80%.
    const nudge = buildJourneyNudge(mascot.xp);
    if (nudge) {
      const tomorrowNoon = new Date();
      tomorrowNoon.setDate(tomorrowNoon.getDate() + 1);
      tomorrowNoon.setHours(12, 0, 0, 0);
      await Notifications.scheduleNotificationAsync({
        content: { title: nudge.title, body: nudge.body },
        trigger: { date: tomorrowNoon, channelId: CARE_CHANNEL_ID },
      });
    }
  } catch (err) {
    // Expo Go/iOS pode lançar em APIs de notificação — nunca quebrar o boot.
    logger.warn('[push] syncPushSchedules falhou', {
      userId: profile.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
