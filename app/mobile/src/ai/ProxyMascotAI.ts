/**
 * Cliente do proxy de IA no backend — chave OpenAI nunca no dispositivo.
 *
 * Contrato server-side (`supabase/functions/mascot-reply/index.ts`):
 *  - POST direto no `EXPO_PUBLIC_AI_PROXY_URL` (não tem prefixo `/v1/...`).
 *  - Payload schema fixo (user_id_hash, tier, personality, dna_descriptors,
 *    mood, message, context_memories, history, safety_flag, language,
 *    idempotency_key).
 *  - Resposta: { reply, source, tokens_used, remaining_quota, cached }.
 *
 * Auth (mai/2026):
 *  - Quando `EXPO_PUBLIC_SUPABASE_JWT` estiver no env (futuro: integrar Supabase
 *    auth), enviamos como Bearer. Backend valida e descarta user_id_hash/tier.
 *  - Sem JWT, o backend precisa estar com `REQUIRE_AUTH=false` (dev) ou retorna
 *    401 — caller cai no fallback local sem ruído.
 */

import type { MascotDNA, Personality, SafetyFlag } from '@/types';
import type { AiResponse, GenerateReplyOptions, HistoryMsg } from '@/lib/ai';
import type { MemoryItem } from '@/lib/memory';
import { logger } from '@/lib/logger';
import { toAiResponse } from './AIResponseValidator';
import { dnaDescriptors } from '@/lib/dna/descriptors';
import type { Genome } from '@/lib/dna/genome';
import { localSubscriptionRepo } from '@/repositories/local';
import type { BillingTierId } from '@/content/billing';

const PROXY_TIMEOUT_MS = 20_000;
const MAX_MEMORY_LEN = 500;
const MAX_DESCRIPTOR_LEN = 200;
const MAX_HISTORY_LEN = 20;
const MAX_MEMORIES = 10;
const MAX_DESCRIPTORS = 20;
const USER_HASH_MIN_LEN = 8;
const USER_HASH_PAD = 'anonymous-user';

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
  /** Classificação safety do input (vinda do classifier do cliente). Backend
   *  rejeita critical/high — caller deve evitar proxy nesses casos. */
  safetyFlag?: SafetyFlag;
  /** 'pt' | 'en'. Default 'pt'. */
  language?: 'pt' | 'en';
  /** Humor atual da criatura. Default 'ok'. */
  mood?: string;
}

/**
 * Hash não-criptográfico (djb2) — só pra obfuscar user_id local no audit log.
 * Não é PII porque userId já é gerado client-side (sem email/nome). Backend usa
 * só como chave de agrupamento.
 */
function hashUserId(userId: string): string {
  let h = 5381;
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) + h + userId.charCodeAt(i)) | 0;
  }
  // hex unsigned 32-bit + tag pra atingir os 8 chars mínimos do schema.
  return `u_${(h >>> 0).toString(16).padStart(8, '0')}`;
}

function safetyFlagAllowedByProxy(flag: SafetyFlag | undefined): boolean {
  // Backend rejeita high/critical com 422. Caller já trata local — não chama
  // proxy aqui mas guarda dupla por segurança.
  return flag !== 'high' && flag !== 'critical';
}

function clampMemoryContent(items: readonly MemoryItem[]): string[] {
  return items.slice(0, MAX_MEMORIES).map(m => {
    const s = String(m.summary ?? '');
    return s.length > MAX_MEMORY_LEN ? s.slice(0, MAX_MEMORY_LEN) : s;
  });
}

function dnaDescriptorList(dna: MascotDNA | undefined): string[] {
  if (!dna) return [];
  const ds = dnaDescriptors(dna as Genome);
  return ds.slice(0, MAX_DESCRIPTORS).map(d => {
    return d.length > MAX_DESCRIPTOR_LEN ? d.slice(0, MAX_DESCRIPTOR_LEN) : d;
  });
}

function clampHistory(history: readonly HistoryMsg[] | undefined): HistoryMsg[] {
  if (!history) return [];
  return history.slice(-MAX_HISTORY_LEN).map(h => ({ role: h.role, content: h.content }));
}

async function resolveTier(userId: string | undefined): Promise<BillingTierId> {
  if (!userId) return 'free';
  try {
    return await localSubscriptionRepo.getTier(userId);
  } catch {
    return 'free';
  }
}

function makeIdempotencyKey(userId: string | undefined, message: string): string {
  // ID curto baseado em ts+hash da msg pra retry de rede dentro de 10min ser
  // identificado. Hash do conteúdo + truncated timestamp da janela atual (
  // 5min) — duas chamadas idênticas em sequência viram a mesma key.
  const winMs = 5 * 60 * 1000;
  const win = Math.floor(Date.now() / winMs);
  const base = `${userId ?? 'anon'}|${win}|${message}`;
  let h = 5381;
  for (let i = 0; i < base.length; i++) h = ((h << 5) + h + base.charCodeAt(i)) | 0;
  return `i_${(h >>> 0).toString(16)}`;
}

export async function proxyMascotReply(
  personality: Personality,
  userMessage: string,
  options: ProxyOptions = {},
): Promise<AiResponse | null> {
  const base = getAiProxyUrl();
  if (!base) return null;

  // Safety gate redundante: caller (lib/ai.ts) já não chama proxy se flag
  // for high/critical, mas mantemos a guarda pra não desperdiçar request HTTP
  // que o backend rejeitaria com 422.
  if (!safetyFlagAllowedByProxy(options.safetyFlag)) return null;

  const userId = options.userId;
  const userHash = userId ? hashUserId(userId) : USER_HASH_PAD;
  // user_id_hash precisa ter >= 8 chars no validator do edge function.
  const safeUserHash = userHash.length >= USER_HASH_MIN_LEN ? userHash : USER_HASH_PAD;
  const tier = await resolveTier(userId);

  const payload = {
    user_id_hash: safeUserHash,
    tier,
    personality,
    dna_descriptors: dnaDescriptorList(options.dna),
    mood: options.mood ?? 'ok',
    message: userMessage,
    context_memories: clampMemoryContent(options.memories ?? []),
    history: clampHistory(options.history),
    safety_flag: options.safetyFlag ?? 'safe',
    language: options.language ?? 'pt',
    idempotency_key: makeIdempotencyKey(userId, userMessage),
  };

  const url = base.replace(/\/$/, '');

  // Bearer JWT opcional — quando integrar Supabase auth, expor token via env.
  // Sem token, backend precisa de REQUIRE_AUTH=false (dev/staging).
  const jwt = process.env.EXPO_PUBLIC_SUPABASE_JWT?.trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn('[ai] proxy HTTP error', { status: res.status });
      return null;
    }
    const data = (await res.json()) as {
      reply?: string;
      source?: 'openai' | 'fallback' | 'cache';
      tokens_used?: number;
      remaining_quota?: number;
      cached?: boolean;
    };
    if (!data.reply) return null;
    const totalTokens = Number(data.tokens_used) || 0;
    // Cache hits / fallback do servidor são tratados como source 'openai' do
    // ponto-de-vista do cliente (resposta IA real veio do servidor). A
    // diferenciação fica no analytics server-side via ai_usage.source.
    const clientSource = data.source === 'fallback' ? 'fallback' : 'openai';
    const response = toAiResponse({ reply: data.reply }, clientSource);
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
