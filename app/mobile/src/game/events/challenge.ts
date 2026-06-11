import { analytics } from '@/analytics';
import {
  checkins as checkinsDb,
  eventClaims,
  wallet as walletDb,
  withLock,
} from '@/lib/db';
import { activeLimitedEvent, type LimitedEvent } from '@/lib/events';
import { dateLocal } from '@/lib/db/dates';
import type { Profile } from '@/types';

/**
 * Desafios de Evento — meta curta dentro da janela de um evento limitado,
 * com baú resgatável. O gancho de retenção do fim de semana (maior janela
 * de churn): "3 check-ins no sábado/domingo → baú lendário".
 *
 * Mesmo contrato de segurança do resto da economia:
 *  - progresso é DERIVADO dos check-ins reais (sem contador paralelo);
 *  - resgate idempotente por OCORRÊNCIA (evento + data de início) via
 *    eventClaims.tryClaim atômico — semana que vem é outro desafio;
 *  - pagamento via wallet.add canônico.
 */

export interface EventChallenge {
  /** Ocorrência única: `${eventId}:${yyyy-mm-dd do início}`. */
  id: string;
  eventId: string;
  emoji: string;
  title: string;
  description: string;
  /** Check-ins dentro da janela do evento. */
  target: number;
  reward: { coins: number; gems: number };
  windowStart: Date;
  windowEnd: Date;
}

/** Metas por evento — curtas o bastante pra serem GANHÁVEIS num dia bom. */
const CHALLENGE_SPECS: Record<string, { target: number; coins: number; gems: number; title: string; description: string }> = {
  'weekend-double-xp': {
    target: 3,
    coins: 120,
    gems: 2,
    title: 'Desafio do fim de semana',
    description: '3 check-ins entre sábado e domingo abrem um baú lendário.',
  },
  'tonight-coins-x3': {
    target: 2,
    coins: 60,
    gems: 1,
    title: 'Desafio da noite',
    description: '2 check-ins até as 23h abrem um baú especial.',
  },
};

/** Desafio da ocorrência ATUAL do evento ativo (null sem evento/spec). */
export function activeEventChallenge(now: Date = new Date()): EventChallenge | null {
  const ev: LimitedEvent | null = activeLimitedEvent(now);
  if (!ev) return null;
  const spec = CHALLENGE_SPECS[ev.id];
  if (!spec) return null;
  const windowStart = ev.start(now);
  const windowEnd = ev.end(now);
  return {
    id: `${ev.id}:${dateLocal(windowStart)}`,
    eventId: ev.id,
    emoji: ev.emoji,
    title: spec.title,
    description: spec.description,
    target: spec.target,
    reward: { coins: spec.coins, gems: spec.gems },
    windowStart,
    windowEnd,
  };
}

/** Progresso: check-ins reais dentro da janela (derivado, nunca contador). */
export async function challengeProgress(
  userId: string,
  challenge: EventChallenge,
): Promise<number> {
  const all = await checkinsDb.listAll(userId);
  const startMs = challenge.windowStart.getTime();
  const endMs = challenge.windowEnd.getTime();
  return all.filter(c => {
    const t = new Date(c.occurred_at).getTime();
    return Number.isFinite(t) && t >= startMs && t <= endMs;
  }).length;
}

export interface ChallengeClaimOutcome {
  claimed: boolean;
  /** 'incomplete' = meta não atingida; 'already' = já resgatado. */
  reason?: 'incomplete' | 'already';
  coins: number;
  gems: number;
}

/**
 * Resgata o baú do desafio. Idempotente e serializado por usuário:
 * progresso re-verificado DENTRO do lock (sem TOCTOU com check-ins
 * concorrentes), tryClaim atômico decide quem paga.
 */
export async function claimEventChallenge(
  profile: Profile,
  challenge: EventChallenge,
): Promise<ChallengeClaimOutcome> {
  return withLock(`event_challenge:${profile.id}`, async () => {
    const progress = await challengeProgress(profile.id, challenge);
    if (progress < challenge.target) {
      return { claimed: false, reason: 'incomplete' as const, coins: 0, gems: 0 };
    }
    const fresh = await eventClaims.tryClaim(profile.id, challenge.id);
    if (!fresh) {
      return { claimed: false, reason: 'already' as const, coins: 0, gems: 0 };
    }
    await walletDb.add(profile.id, challenge.reward.coins, challenge.reward.gems);
    analytics.track('event_challenge_claimed', {
      event_id: challenge.eventId,
      target: challenge.target,
      coins: challenge.reward.coins,
      gems: challenge.reward.gems,
    });
    return { claimed: true, coins: challenge.reward.coins, gems: challenge.reward.gems };
  });
}
