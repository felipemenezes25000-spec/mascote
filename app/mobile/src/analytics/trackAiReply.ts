/**
 * Instrumentação de IA — Pilar 3 (chat Plus útil/rápido).
 */

import { analytics } from './AnalyticsService';
import type { AiReplySource } from './AnalyticsEvents';
import type { BillingTierId } from '@/content/billing';
import type { AiResponse } from '@/lib/ai';

export function aiSourceFromResponse(
  result: Pick<AiResponse, 'source'>,
  opts: { usedProxy: boolean; hadApiKey: boolean },
): AiReplySource {
  if (opts.usedProxy && result.source !== 'mock') return 'proxy';
  if (result.source === 'openai' && opts.hadApiKey) return 'byok';
  if (result.source === 'openai' && !opts.hadApiKey) return 'proxy';
  return 'local';
}

export function trackAiReplyRequested(tier: BillingTierId, source: AiReplySource): void {
  analytics.track('ai_reply_requested', { source, tier });
}

export function trackAiReplySucceeded(
  tier: BillingTierId,
  source: AiReplySource,
  latencyMs: number,
): void {
  analytics.track('ai_reply_succeeded', { source, latency_ms: latencyMs, tier });
}

export function trackAiReplyFailed(
  tier: BillingTierId,
  source: AiReplySource,
  reason: string,
): void {
  analytics.track('ai_reply_failed', { source, reason, tier });
}

export function trackAiReplyRated(helpful: boolean, repetition: boolean): void {
  analytics.track('ai_reply_rated', { helpful, repetition });
}
