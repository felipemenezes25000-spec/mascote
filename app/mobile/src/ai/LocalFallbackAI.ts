/**
 * Fallback local quando OpenAI indisponível.
 */

import { mockReply, classifyIntent } from '@/content/replies';
import type { Personality, SafetyFlag } from '@/types';
import type { AiResponse } from '@/lib/ai';

export function localFallbackReply(
  personality: Personality,
  userMessage: string,
): AiResponse {
  const intent = classifyIntent(userMessage);
  const reply = mockReply(personality, intent);
  return {
    reply,
    safety_flag: 'safe' as SafetyFlag,
    source: 'fallback',
  };
}
