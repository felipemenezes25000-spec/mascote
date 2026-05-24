/**
 * Fachada de IA do mascote — unifica lib/ai + camada game.
 */

export { generateReply, type AiResponse, type GenerateReplyOptions } from '@/lib/ai';
export { buildMascotPrompt } from './PromptBuilder';
export { evaluateUserMessage, sanitizeMascotOutput } from './SafetyRules';
export { localFallbackReply } from './LocalFallbackAI';
export { generateMissionSuggestion } from './MissionGeneratorAI';
export { inferEmotionalTone, emotionalPrefix } from './EmotionalMemory';

import { generateReply as baseGenerateReply } from '@/lib/ai';
import { evaluateUserMessage } from './SafetyRules';
import { localFallbackReply } from './LocalFallbackAI';
import { checkAiRateLimit, recordAiUsage } from './AIRateLimiter';
import { checkAiCostBudget, recordAiCost } from './AICostGuard';
import {
  aiSourceFromResponse,
  trackAiReplyFailed,
  trackAiReplyRequested,
  trackAiReplySucceeded,
} from '@/analytics/trackAiReply';
import { localSubscriptionRepo } from '@/repositories/local';
import type { Personality } from '@/types';
import type { GenerateReplyOptions } from '@/lib/ai';

/** Gera resposta com safety gate + fallback automático. */
export async function mascotReply(
  personality: Personality,
  userMessage: string,
  options?: GenerateReplyOptions,
) {
  const startedAt = Date.now();
  const tier = options?.userId
    ? await localSubscriptionRepo.getTier(options.userId)
    : 'free';

  const safety = evaluateUserMessage(userMessage);
  if (!safety.allowed && safety.redirect) {
    trackAiReplyRequested(tier, 'local');
    trackAiReplySucceeded(tier, 'local', Date.now() - startedAt);
    return {
      reply: safety.redirect,
      safety_flag: safety.flag,
      source: 'fallback' as const,
    };
  }

  if (options?.userId) {
    const rate = await checkAiRateLimit(options.userId, tier);
    if (!rate.allowed) {
      trackAiReplyRequested(tier, 'local');
      trackAiReplySucceeded(tier, 'local', Date.now() - startedAt);
      return {
        reply: rate.reason ?? 'Limite diário atingido.',
        safety_flag: 'safe',
        source: 'fallback' as const,
      };
    }
    const cost = await checkAiCostBudget(options.userId, tier);
    if (!cost.allowed) {
      trackAiReplyRequested(tier, 'local');
      trackAiReplySucceeded(tier, 'local', Date.now() - startedAt);
      return {
        reply: cost.reason ?? 'Orçamento de IA esgotado hoje.',
        safety_flag: 'safe',
        source: 'fallback' as const,
      };
    }
  }

  try {
    const result = await baseGenerateReply(personality, userMessage, options);
    if (options?.userId && result.source !== 'fallback') {
      await recordAiUsage(options.userId);
      // Usa token count real quando o provider devolveu (OpenAI/Proxy);
      // estimativa fixa só pra paths que não retornam usage.
      await recordAiCost(options.userId, result.usage?.totalTokens);
    }
    // Happy path: emite request + succeeded com source real. Antes só os
    // ramos de safety/rate/cost/catch emitiam, então `ai_reply_succeeded`
    // não cobria justamente as respostas que funcionaram.
    const source = aiSourceFromResponse(result, {
      usedProxy: result.source === 'openai' && !options?.apiKey,
      hadApiKey: !!options?.apiKey,
    });
    trackAiReplyRequested(tier, source);
    trackAiReplySucceeded(tier, source, Date.now() - startedAt);
    return result;
  } catch {
    trackAiReplyRequested(tier, 'local');
    trackAiReplyFailed(tier, 'local', 'mascot_reply_exception');
    let memories: import('@/lib/memory').MemoryItem[] = [];
    if (options?.userId) {
      try {
        const { recall } = await import('@/lib/memory');
        memories = await recall(options.userId, userMessage, 2);
      } catch { /* memória opcional */ }
    }
    const fallback = localFallbackReply(personality, userMessage, {
      mascotName: options?.mascotName,
      memories,
    });
    trackAiReplySucceeded(tier, 'local', Date.now() - startedAt);
    return fallback;
  }
}
