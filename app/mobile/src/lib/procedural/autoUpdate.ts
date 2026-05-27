/**
 * Orchestrator dos triggers IA-procedural.
 *
 * Combina detection + rate-limit + generate + save numa função única.
 * Chamada após mudanças no mascote (phase change, streak milestone, etc.).
 *
 * Idempotente: se cooldown ativo ou trigger inválido, é no-op silencioso.
 * Nunca lança — falhas são logadas mas não propagadas pra UI.
 */

import type { HabitKind, Mascot, Personality } from '@/types';
import { logger } from '@/lib/logger';
import { mascots } from '@/lib/db/mascots';
import { generateProceduralGenome, shouldRegenerate, type GenerateInput } from './generate';
import {
  onPhaseChange,
  onStreakDay,
  onMessageCount,
  onAchievementUnlock,
} from './triggers';

export type AutoUpdateContext = {
  mascot: Mascot;
  prevPhase?: Mascot['phase'] | null;
  streak?: number;
  messageCount?: number;
  newAchievement?: { id: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' };
  recentActions?: readonly HabitKind[];
  recentChatThemes?: readonly string[];
};

/**
 * Tenta auto-atualizar o ProceduralGenome se algum milestone foi atingido.
 * Devolve o genome novo (e persistiu) ou null se nada disparou.
 */
export async function maybeAutoUpdateGenome(ctx: AutoUpdateContext): Promise<Mascot | null> {
  if (!shouldRegenerate(ctx.mascot.procedural_genome)) {
    // Cooldown ativo — economiza chamada LLM mesmo se trigger acionou
    return null;
  }

  const trigger =
    onPhaseChange(ctx.prevPhase ?? null, ctx.mascot.phase)
    ?? (ctx.streak !== undefined ? onStreakDay(ctx.streak) : null)
    ?? (ctx.messageCount !== undefined ? onMessageCount(ctx.messageCount) : null)
    ?? (ctx.newAchievement ? onAchievementUnlock(ctx.newAchievement.id, ctx.newAchievement.rarity) : null);

  if (!trigger) return null;

  try {
    const input: GenerateInput = {
      userId: ctx.mascot.user_id,
      personality: ctx.mascot.personality as Personality,
      trigger,
      currentGenome: ctx.mascot.procedural_genome ?? null,
      recentActions: ctx.recentActions,
      recentChatThemes: ctx.recentChatThemes,
      streak: ctx.streak,
      phase: ctx.mascot.phase,
      mascotName: ctx.mascot.name,
    };
    const genome = await generateProceduralGenome(input);
    const updated = await mascots.updateProceduralGenome(ctx.mascot.user_id, genome);
    logger.dev('[procedural] genome auto-atualizado', { trigger, userId: ctx.mascot.user_id });
    return updated;
  } catch (err) {
    logger.warn('[procedural] auto-update falhou', { err: String(err) });
    return null;
  }
}
