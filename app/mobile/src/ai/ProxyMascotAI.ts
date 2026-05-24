/**
 * Cliente do proxy de IA no backend — chave OpenAI nunca no dispositivo.
 *
 * Envia personalidade + system prompt completo (com DNA + memórias) pro
 * backend. Backend pode reaproveitar o prompt OU substituir pelo seu próprio
 * — payload é aditivo, sem regressão se o backend ignorar campos.
 */

import type { MascotDNA, Personality, SafetyFlag } from '@/types';
import type { AiResponse, GenerateReplyOptions, HistoryMsg } from '@/lib/ai';
import type { MemoryItem } from '@/lib/memory';
import { logger } from '@/lib/logger';
import { toAiResponse } from './AIResponseValidator';
import { buildMascotSystemPrompt, PERSONALITY_FLAVOR } from './MascotPrompt';

const PROXY_TIMEOUT_MS = 20_000;

export interface MascotReplyContractRequest {
  personality: Personality;
  message: string;
  history: HistoryMsg[];
  mascotName?: string;
  userId?: string;
  system_prompt: string;
  personality_flavor: string;
  recent_replies: string[];
}

interface MascotReplyContractResponse {
  reply?: string;
  safety_flag?: SafetyFlag;
  usage?: { total_tokens?: number };
}

export function buildMascotReplyContractRequest(
  personality: Personality,
  userMessage: string,
  options: ProxyOptions = {},
): MascotReplyContractRequest {
  const systemPrompt = buildMascotSystemPrompt({
    personality,
    memories: options.memories,
    mascotName: options.mascotName,
    dna: options.dna,
  });
  return {
    personality,
    message: userMessage,
    history: options.history ?? [],
    mascotName: options.mascotName,
    userId: options.userId,
    system_prompt: systemPrompt,
    personality_flavor: PERSONALITY_FLAVOR[personality],
    recent_replies: options.recentReplies ?? [],
  };
}

export function getAiProxyUrl(): string | undefined {
  const url = process.env.EXPO_PUBLIC_AI_PROXY_URL?.trim();
  return url && url.length > 0 ? url : undefined;
}

export function isAiProxyConfigured(): boolean {
  return Boolean(getAiProxyUrl());
}

export interface ProxyOptions extends GenerateReplyOptions {
  memories?: MemoryItem[];
  dna?: MascotDNA;
  /** Replies recentes pra backend instruir o modelo a não ecoar. */
  recentReplies?: string[];
}

export async function proxyMascotReply(
  personality: Personality,
  userMessage: string,
  options: ProxyOptions = {},
): Promise<AiResponse | null> {
  const base = getAiProxyUrl();
  if (!base) return null;
  const payload = buildMascotReplyContractRequest(personality, userMessage, options);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/mascot/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn('[ai] proxy HTTP error', { status: res.status });
      return null;
    }
    const data = (await res.json()) as MascotReplyContractResponse;
    if (!data.reply) return null;
    const totalTokens = Number(data.usage?.total_tokens) || 0;
    const response = toAiResponse(data, 'openai');
    if (totalTokens > 0) response.usage = { totalTokens };
    return response;
  } catch (err) {
    const safeMsg = err instanceof Error ? err.message : 'unknown';
    logger.warn('[ai] proxy request failed', { reason: safeMsg });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type { HistoryMsg };
