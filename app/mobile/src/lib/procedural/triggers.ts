/**
 * Triggers que disparam regeneração do ProceduralGenome.
 *
 * Cada função detecta um milestone e devolve a `MilestoneTrigger` correspondente,
 * ou `null` quando o evento não é digno de gerar. Caller responsável por
 * chamar `generateProceduralGenome(trigger)` quando recebe um valor não-nulo.
 *
 * Rate limit (1/24h) é aplicado em `generate.ts`, não aqui — triggers
 * indicam "milestone aconteceu", limite controla "podemos gastar LLM agora".
 */

import type { MascotPhase, MilestoneTrigger } from '@/types';

const STREAK_MILESTONES = [7, 30, 100, 365] as const;
const MESSAGE_MILESTONES = [100, 1000, 10000] as const;

export function onPhaseChange(prev: MascotPhase | null, next: MascotPhase): MilestoneTrigger | null {
  if (prev === next) return null;
  return `evolution:${next}`;
}

export function onStreakDay(days: number): MilestoneTrigger | null {
  if (!Number.isFinite(days) || days <= 0) return null;
  if (STREAK_MILESTONES.includes(days as (typeof STREAK_MILESTONES)[number])) {
    return `streak:${days}d`;
  }
  return null;
}

export function onAchievementUnlock(id: string, rarity: 'common' | 'rare' | 'epic' | 'legendary'): MilestoneTrigger | null {
  if (!id || typeof id !== 'string') return null;
  // Só rare+ disparam regeneração — comuns são frequentes demais.
  if (rarity === 'common') return null;
  return `achievement:${id}`;
}

export function onMessageCount(count: number): MilestoneTrigger | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  if (MESSAGE_MILESTONES.includes(count as (typeof MESSAGE_MILESTONES)[number])) {
    return `messages:${count}`;
  }
  return null;
}

export function onOnboardingComplete(): MilestoneTrigger {
  return 'onboarding';
}
