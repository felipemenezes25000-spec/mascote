import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifications as notifDb, settings as settingsDb, todayLocal, dateLocal } from '@/lib/db';
import type { InAppNotification, Profile } from '@/types';

/**
 * Centraliza geração de notificações in-app.
 * Em produção, daria pra agendar via expo-notifications. Aqui ficamos no banco
 * local + a UI lê em tempo real.
 */

const DEDUP_PER_DAY: ReadonlyArray<InAppNotification['kind']> = [
  'weekly_report',
  'streak_at_risk',
  'reminder',
];

export async function notify(
  profile: Profile,
  kind: InAppNotification['kind'],
  title: string,
  body: string,
  payload?: Record<string, unknown>
): Promise<InAppNotification | null> {
  const s = await settingsDb.get(profile.id);
  // Respeita opt-out global
  if (!s.push_enabled && kind !== 'safety') return null;

  // Respeita pause
  if (s.paused_until && s.paused_until > todayLocal()) {
    if (kind !== 'safety') return null;
  }

  // Respeita quiet hours pra notificações não-críticas
  if (kind !== 'safety') {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const nowHM = `${hh}:${mm}`;
    if (isInQuietWindow(nowHM, normalizeHM(s.quiet_start), normalizeHM(s.quiet_end))) {
      return null;
    }
  }

  // Dedup por dia LOCAL (created_at é UTC ISO; convertemos pra data local
  // do user antes de comparar com today). Sem isso, um user em UTC-3 vê
  // notifs criadas após 21h local terem `created_at` no dia UTC seguinte
  // e o dedup falhar.
  if (DEDUP_PER_DAY.includes(kind)) {
    const today = todayLocal();
    const existing = await notifDb.list(profile.id);
    const sameToday = existing.find(
      n => n.kind === kind && dateLocal(new Date(n.created_at)) === today
    );
    if (sameToday) return null;
  }

  return notifDb.add({
    user_id: profile.id,
    kind,
    title,
    body,
    payload: payload ?? null,
    read_at: null,
  });
}

/** Aceita "9:00" e converte pra "09:00" — comparação string só funciona zero-padded. */
function normalizeHM(hm: string): string {
  if (!/^\d{1,2}:\d{2}$/.test(hm)) return hm;
  const [h, m] = hm.split(':');
  return `${h.padStart(2, '0')}:${m}`;
}

function isInQuietWindow(now: string, start: string, end: string): boolean {
  if (start === end) return false;
  if (start <= end) {
    return now >= start && now < end;
  }
  // crossover meia-noite
  return now >= start || now < end;
}

export async function maybeNotifyStreakAtRisk(profile: Profile, streakDays: number, lastActive: string | null): Promise<void> {
  if (streakDays < 1 || !lastActive) return;
  const today = todayLocal();
  if (lastActive === today) return;
  // Streaks de 7+ dias: hábito já provado, grace days protegem se pular um.
  // Notif "em risco" só gera ansiedade pra esse perfil — silenciamos.
  // Mantemos só pra streaks 1-6 onde o hábito ainda está se formando e
  // um lembrete factual ajuda mais que assusta.
  if (streakDays >= 7) return;
  // 18-22h alerta de streak em risco
  const hour = new Date().getHours();
  if (hour < 18 || hour >= 22) return;
  await notify(
    profile,
    'streak_at_risk',
    'Seu ritmo está vivo',
    `Você construiu ${streakDays} dia${streakDays > 1 ? 's' : ''} de cuidado. Se quiser hoje, um check-in curtinho mantém o ritmo.`,
    { streakDays }
  );
}

export async function notifyWeeklyReportReady(profile: Profile): Promise<void> {
  await notify(
    profile,
    'weekly_report',
    'Seu resumo da semana',
    'Quando quiser, seu resumo já está pronto com os últimos 7 dias.'
  );
}

// Marcos de aniversário: cada um dispara UMA vez na vida do mascote.
// Persistido fora do namespace `mascote:` para sobreviver a importAll/exportAll
// específicos de tabela (mas é limpo por resetAll).
const BIRTHDAY_GRACE_DAYS = 7;
const BIRTHDAY_MARK_KEY = (profileId: string, milestone: number) =>
  `birthday_shown:${profileId}:${milestone}`;

async function tryNotifyBirthday(
  profile: Profile,
  daysOld: number,
  milestone: number,
  title: string,
  body: string
): Promise<void> {
  if (daysOld < milestone || daysOld >= milestone + BIRTHDAY_GRACE_DAYS) return;
  const key = BIRTHDAY_MARK_KEY(profile.id, milestone);
  const shown = await AsyncStorage.getItem(key);
  if (shown) return;
  const created = await notify(profile, 'birthday', title, body, { milestone });
  if (created) {
    await AsyncStorage.setItem(key, new Date().toISOString());
  }
}

export async function notifyMascotBirthday(profile: Profile, daysOld: number): Promise<void> {
  await tryNotifyBirthday(profile, daysOld, 30, 'Um mês juntos', 'Já faz cerca de 30 dias de parceria leve entre vocês.');
  await tryNotifyBirthday(profile, daysOld, 100, '100 dias juntos', 'Um marco bonito, no ritmo de vocês dois.');
  await tryNotifyBirthday(profile, daysOld, 365, '1 ano juntos!', 'Cerca de 365 dias desde o primeiro check-in. Que jornada.');
}
