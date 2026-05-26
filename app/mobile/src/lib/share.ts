/**
 * K-factor helpers — copy de share/invite + detecção de milestones.
 *
 * Isolado em lib pra (a) ser testável sem montar UI, (b) permitir override
 * de copy via feature flag no futuro (A/B test de invite text).
 */

import type { Mascot, Personality } from '@/types';
import { getPersonality } from '@/content/personalities';

/**
 * Streak milestones que dobram share-rate em estudos de growth (Finch, Strava).
 * Declaração explícita do conjunto pra evitar magic numbers espalhados.
 */
export const STREAK_MILESTONES: readonly number[] = [3, 7, 14, 30, 60, 100, 180, 365];

export function isStreakMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak);
}

/**
 * Próximo milestone à frente do streak atual (pra UI de progresso "faltam X dias").
 * Retorna null se já passou de todos os milestones declarados.
 */
export function nextMilestone(streak: number): number | null {
  for (const m of STREAK_MILESTONES) {
    if (m > streak) return m;
  }
  return null;
}

/**
 * Link de invite — placeholder até deeplink real ser configurado.
 * Em prod, o suffix vira referral code rastreável no analytics.
 *
 * Por segurança: não vaza o user_id completo, só os últimos 6 chars
 * (suficiente pra colisão extremamente improvável em base populacional pequena).
 */
export function buildInviteLink(userId: string | undefined | null): string {
  // Strings vazias / só whitespace tambem caem no fallback "amigo" —
  // `if (!userId)` deixava `' '` truthy passar e o tag virava ' '.
  if (!userId || !userId.trim()) return 'https://mascote.app/i/amigo';
  const tag = userId.length >= 6 ? userId.slice(-6) : userId;
  // userId é tipado string mas pode conter `/`, `?`, `#`, espaço, unicode
  // (Supabase UUIDs hoje, mas o tipo nao garante). Sem encode, URL fica
  // ambigua tipo `https://mascote.app/i/abc/def`.
  return `https://mascote.app/i/${encodeURIComponent(tag)}`;
}

/**
 * Copy de share de progresso — varia se for milestone.
 */
export function buildProgressShareText(input: {
  streak: number;
  todayCount: number;
  isMilestone?: boolean;
}): string {
  const milestone = input.isMilestone ?? isStreakMilestone(input.streak);
  const prefix = milestone ? `🎉 ${input.streak} dias seguidos! ` : '';
  return `${prefix}Hoje cuidei de mim ${input.todayCount}x no Mascote. Streak: ${input.streak} dias 🌱`;
}

/**
 * Copy de invite — usa a personalidade do mascote pra autenticar a voz.
 * "Eu tô usando" (primeira pessoa, casual) > "Você precisa conhecer" (vendedor).
 */
export function buildInviteText(input: {
  personality: Personality;
  level: number;
  mascotName: string;
  link: string;
}): string {
  const meta = getPersonality(input.personality);
  return (
    `Eu tô usando o Mascote pra cuidar de mim. ` +
    `${input.mascotName} (meu ${meta.label.toLowerCase()}) já tá em nível ${input.level}.\n\n` +
    `Vem com a gente? Sem cobrança, sem culpa.\n${input.link}`
  );
}

/**
 * Conveniência: monta payload completo de invite a partir do mascote.
 * Usado pela tela share.tsx; isolado pra ser testado em snapshot.
 */
export function buildInvitePayload(mascot: Pick<Mascot, 'personality' | 'level' | 'name'>, userId: string | undefined | null) {
  const link = buildInviteLink(userId);
  const text = buildInviteText({
    personality: mascot.personality,
    level: mascot.level,
    mascotName: mascot.name,
    link,
  });
  return { link, text };
}
