/**
 * Weekly snapshot — cria um look automático "Semana N" se faz > 7 dias do
 * último snapshot salvo (manual OU automático).
 *
 * Por quê: ao longo de meses, usuário tem um histórico visual da jornada
 * com o mascote. "Como ele era na Semana 4? Que mutations já tinha?"
 *
 * Decisões:
 *  - Conta na cota de MAX_LOOKS_PER_USER — FIFO trim já cuida do overflow
 *    (não cria slot infinito; mantém últimos 5 looks incluindo os auto)
 *  - Naming: "Semana N (auto)" pra distinguir de manuais
 *  - Idempotente: chamadas múltiplas em <7 dias = NO-OP silent
 *  - Trigger no atelier mount — leveza por cima de I/O já que estado é lido
 *
 * Limitação intencional: cota compartilhada significa snapshots automáticos
 * podem empurrar manuais. Usuário pode bloquear desabilitando em settings
 * (futuro slice se reclamado).
 */

import { atelierLooks, type AtelierLook } from '@/lib/db';
import type { MascotCustomization, Profile } from '@/types';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const AUTO_PREFIX = 'Semana ';
const AUTO_SUFFIX = ' (auto)';

/**
 * Calcula o número da semana (1-indexed) desde o profile.created_at.
 * Semana 1 = primeiros 7 dias. Semana N = (N-1)*7 dias depois.
 */
export function weekNumber(profileCreatedAt: string, now: number = Date.now()): number {
  const created = new Date(profileCreatedAt).getTime();
  if (!Number.isFinite(created) || created > now) return 1;
  const days = Math.floor((now - created) / (24 * 60 * 60 * 1000));
  return Math.max(1, Math.floor(days / 7) + 1);
}

/**
 * Detecta se ALGUM look automático foi criado nas últimas WEEK_MS.
 * Usa naming convention (prefix + suffix) pra identificar — sem schema mudança.
 */
function hasRecentAutoSnapshot(looks: readonly AtelierLook[], now: number = Date.now()): boolean {
  return looks.some(l => {
    if (!l.name.startsWith(AUTO_PREFIX) || !l.name.endsWith(AUTO_SUFFIX)) return false;
    const createdMs = new Date(l.created_at).getTime();
    if (!Number.isFinite(createdMs)) return false;
    return now - createdMs < WEEK_MS;
  });
}

export interface MaybeCreateWeeklySnapshotResult {
  /** Look novo criado, ou null se foi NO-OP. */
  created: AtelierLook | null;
  /** Motivo do skip (quando created=null). Útil pra debug/log. */
  reason?: 'recent_auto_exists' | 'no_profile' | 'error';
}

/**
 * Cria snapshot semanal se devido. Idempotente — seguro chamar a cada mount.
 *
 * Retorna o look criado ou explica por que skipou.
 */
export async function maybeCreateWeeklySnapshot(
  profile: Profile | null,
  customization: MascotCustomization,
  now: number = Date.now(),
): Promise<MaybeCreateWeeklySnapshotResult> {
  if (!profile?.id) return { created: null, reason: 'no_profile' };

  try {
    const existing = await atelierLooks.list(profile.id);
    if (hasRecentAutoSnapshot(existing, now)) {
      return { created: null, reason: 'recent_auto_exists' };
    }
    const week = weekNumber(profile.created_at ?? new Date(now).toISOString(), now);
    const name = `${AUTO_PREFIX}${week}${AUTO_SUFFIX}`;
    const created = await atelierLooks.save(profile.id, name, customization);
    return { created };
  } catch {
    return { created: null, reason: 'error' };
  }
}
