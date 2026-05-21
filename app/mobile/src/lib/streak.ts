import type { Streak } from '@/types';
import { daysBetween, streaks, todayLocal, withLock } from './db';

const MAX_GRACE = 5;
const INITIAL_GRACE_AFTER_BROKEN = 2;

export interface StreakResult {
  streak: Streak;
  graceUsed: boolean;
  brokenAndRestarted: boolean;
  /** True se o check-in é no mesmo dia calendário que o último ativo (streak não avançou). */
  sameDay: boolean;
}

/**
 * Calcula o próximo streak dado o estado atual + a data de hoje. Pura.
 * Exportada para facilitar testes determinísticos.
 */
export function nextStreakState(
  current: Streak,
  today: string
): { next: Streak; graceUsed: boolean; brokenAndRestarted: boolean; sameDay: boolean } {
  if (current.last_active_date === today) {
    return { next: current, graceUsed: false, brokenAndRestarted: false, sameDay: true };
  }

  let nextStreak = current.current_streak;
  let nextGrace = current.grace_days_left;
  let graceUsed = false;
  let brokenAndRestarted = false;

  // Trata undefined igual a null — estado persistido de versões antigas
  // (ou downgrade entre schemas) pode ter o campo ausente.
  if (current.last_active_date == null) {
    nextStreak = 1;
  } else {
    const diff = daysBetween(current.last_active_date, today);
    if (diff <= 0) {
      // Clock skew / data no futuro: last_active_date >= today.
      // Não avança nem reseta — só devolve o estado tal qual.
      return { next: current, graceUsed: false, brokenAndRestarted: false, sameDay: true };
    }
    if (diff === 1) {
      nextStreak += 1;
    } else {
      const skipped = diff - 1;
      if (skipped <= nextGrace) {
        nextGrace -= skipped;
        nextStreak += 1;
        graceUsed = true;
      } else {
        nextStreak = 1;
        nextGrace = INITIAL_GRACE_AFTER_BROKEN;
        brokenAndRestarted = true;
      }
    }
  }

  const newLongest = Math.max(current.longest_streak, nextStreak);
  if (nextStreak > 0 && nextStreak % 14 === 0) {
    nextGrace = Math.min(MAX_GRACE, nextGrace + 1);
  }

  const next: Streak = {
    user_id: current.user_id,
    current_streak: nextStreak,
    longest_streak: newLongest,
    last_active_date: today,
    grace_days_left: nextGrace,
    updated_at: new Date().toISOString(),
  };
  return { next, graceUsed, brokenAndRestarted, sameDay: false };
}

/**
 * Aplica check-in à streak. Serializado pela tabela 'streaks' para evitar
 * dupla incrementação em check-ins concorrentes do mesmo usuário.
 *
 * Faz read + compute + upsert dentro de UM mesmo withLock para garantir
 * atomicidade. Para evitar deadlock por re-entrância, NÃO chama streaks.upsert
 * (que faria withLock aninhado): faz o write direto delegando ao lock atual.
 */
export async function applyCheckinToStreak(userId: string): Promise<StreakResult> {
  return withLock('streaks', async () => {
    const current = await streaks.get(userId);
    const today = todayLocal();
    const computed = nextStreakState(current, today);
    if (computed.sameDay) {
      return {
        streak: computed.next,
        graceUsed: computed.graceUsed,
        brokenAndRestarted: computed.brokenAndRestarted,
        sameDay: true,
      };
    }
    // Persiste sem re-entrar no lock: usa o helper de baixo nível upsertNoLock.
    await streaks.upsertNoLock(computed.next);
    return {
      streak: computed.next,
      graceUsed: computed.graceUsed,
      brokenAndRestarted: computed.brokenAndRestarted,
      sameDay: false,
    };
  });
}
