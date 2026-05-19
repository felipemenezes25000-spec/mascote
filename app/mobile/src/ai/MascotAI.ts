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
import type { Personality } from '@/types';
import type { GenerateReplyOptions } from '@/lib/ai';

/** Gera resposta com safety gate + fallback automático. */
export async function mascotReply(
  personality: Personality,
  userMessage: string,
  options?: GenerateReplyOptions,
) {
  const safety = evaluateUserMessage(userMessage);
  if (!safety.allowed && safety.redirect) {
    return {
      reply: safety.redirect,
      safety_flag: safety.flag,
      source: 'fallback' as const,
    };
  }
  try {
    return await baseGenerateReply(personality, userMessage, options);
  } catch {
    let memories: import('@/lib/memory').MemoryItem[] = [];
    if (options?.userId) {
      try {
        const { recall } = await import('@/lib/memory');
        memories = await recall(options.userId, userMessage, 2);
      } catch { /* memória opcional */ }
    }
    return localFallbackReply(personality, userMessage, {
      mascotName: options?.mascotName,
      memories,
    });
  }
}
