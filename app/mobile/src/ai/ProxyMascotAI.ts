/**
 * Cliente do proxy de IA no backend — chave OpenAI nunca no dispositivo.
 */

import type { Personality, SafetyFlag } from '@/types';
import type { AiResponse, GenerateReplyOptions, HistoryMsg } from '@/lib/ai';
import { logger } from '@/lib/logger';
import { toAiResponse } from './AIResponseValidator';

const PROXY_TIMEOUT_MS = 20_000;

export function getAiProxyUrl(): string | undefined {
  const url = process.env.EXPO_PUBLIC_AI_PROXY_URL?.trim();
  return url && url.length > 0 ? url : undefined;
}

export function isAiProxyConfigured(): boolean {
  return Boolean(getAiProxyUrl());
}

export async function proxyMascotReply(
  personality: Personality,
  userMessage: string,
  options: GenerateReplyOptions = {},
): Promise<AiResponse | null> {
  const base = getAiProxyUrl();
  if (!base) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/mascot/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        personality,
        message: userMessage,
        history: options.history ?? [],
        mascotName: options.mascotName,
        userId: options.userId,
      }),
    });
    if (!res.ok) {
      logger.warn('[ai] proxy HTTP error', { status: res.status });
      return null;
    }
    const data = (await res.json()) as { reply?: string; safety_flag?: SafetyFlag };
    if (!data.reply) return null;
    return toAiResponse(data, 'openai');
  } catch (err) {
    const safeMsg = err instanceof Error ? err.message : 'unknown';
    logger.warn('[ai] proxy request failed', { reason: safeMsg });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type { HistoryMsg };
