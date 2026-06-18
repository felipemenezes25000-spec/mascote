/**
 * Fachada de IA do mascote — unifica lib/ai + camada game.
 */

export { generateReply, type AiResponse, type GenerateReplyOptions } from '@/lib/ai';
// PromptBuilder.buildMascotPrompt (REMOVIDO) concatenava userMessage cru no
// system prompt (vetor de prompt injection). Construção de prompt é central em
// `lib/ai.ts:buildMascotSystemPrompt`, que separa roles user/system. Não
// reintroduzir um builder que concatene input cru no system prompt.
export { evaluateUserMessage, sanitizeMascotOutput } from './SafetyRules';
export { localFallbackReply } from './LocalFallbackAI';
export { generateMissionSuggestion } from './MissionGeneratorAI';
export { inferEmotionalTone, emotionalPrefix } from './EmotionalMemory';

import { generateReply as baseGenerateReply } from '@/lib/ai';
import { evaluateUserMessage } from './SafetyRules';
import { localFallbackReply } from './LocalFallbackAI';
import { withLock } from '@/lib/db';
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

  // === Gate atômico (rate + cost + record) com lock per-user ===
  // Antes esse bloco era read-decide-write SEM lock — taps paralelos do mesmo
  // user passavam todos no gate e burlavam o limite. Lock per-user serializa
  // a sequência inteira, preservando paralelismo entre users distintos.
  // `skipGuards: true` evita re-checagem dentro de `baseGenerateReply` (e
  // evita lock reentrante na mesma chave `ai_gate:<uid>`).
  const uid = options?.userId;

  const runGated = async (): Promise<Awaited<ReturnType<typeof baseGenerateReply>>> => {
    // Storage falho NÃO bloqueia resposta — fail-open mantém UX viva, mas
    // pula record quando o gate falhou (sem números coerentes pra incrementar).
    let gateOk = true;
    if (uid) {
      try {
        const rate = await checkAiRateLimit(uid, tier);
        if (!rate.allowed) {
          return {
            reply: rate.reason ?? 'Limite diário atingido.',
            safety_flag: 'safe',
            source: 'fallback' as const,
          };
        }
        const cost = await checkAiCostBudget(uid, tier);
        if (!cost.allowed) {
          return {
            reply: cost.reason ?? 'Orçamento de IA esgotado hoje.',
            safety_flag: 'safe',
            source: 'fallback' as const,
          };
        }
      } catch {
        gateOk = false;
      }
    }
    // skipGuards evita que `generateReply` re-aplique o gate (mesma chave
    // de lock causaria deadlock). Wrapper já é o source-of-truth aqui.
    const result = await baseGenerateReply(personality, userMessage, {
      ...(options ?? {}),
      skipGuards: true,
    });
    if (gateOk && uid && result.source !== 'fallback') {
      // Usa token count real quando o provider devolveu (OpenAI/Proxy);
      // estimativa fixa só pra paths que não retornam usage.
      try {
        await recordAiUsage(uid);
        await recordAiCost(uid, result.usage?.totalTokens);
      } catch {
        // record falhar não bloqueia entrega — best effort.
      }
    }
    return result;
  };

  try {
    const result = uid
      ? await withLock(`ai_gate:${uid}`, runGated)
      : await runGated();

    // Gate negado: emite local request+succeeded como antes do refactor.
    if (uid && result.source === 'fallback' && /Limite|Orçamento/i.test(result.reply)) {
      trackAiReplyRequested(tier, 'local');
      trackAiReplySucceeded(tier, 'local', Date.now() - startedAt);
      return result;
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
      // Preserva a flag avaliada no input (safe|watch — críticas já retornaram
      // cedo no gate de safety acima). Sem isto, "fiz terapia hoje" (watch) que
      // caísse no fallback por exceção do provider virava 'safe'.
      safetyFlag: safety.flag,
    });
    trackAiReplySucceeded(tier, 'local', Date.now() - startedAt);
    return fallback;
  }
}
