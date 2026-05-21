/**
 * Mascote — proxy IA Edge Function (Deno / Supabase).
 *
 * Recebe POST /mascot-reply do cliente, executa rate limit + cache +
 * audit log, chama OpenAI server-side com a chave guardada como secret,
 * e devolve a reply tipada.
 *
 * **NUNCA loga conteúdo de mensagem** — só metadados (tokens, source, flag).
 *
 * Setup mínimo (CLI Supabase):
 *
 *   supabase secrets set OPENAI_API_KEY=sk-...
 *   supabase functions deploy mascot-reply
 *
 * Para o cliente apontar pra esta função:
 *
 *   EXPO_PUBLIC_AI_PROXY_URL=https://<project-ref>.functions.supabase.co/mascot-reply
 *
 * Pré-requisitos do schema (rodar antes — está em docs/SUPABASE_SCHEMA.sql):
 *  - subscription_status (pra ler tier do usuário)
 *  - ai_usage (audit log; criar abaixo se ainda não existir)
 *
 * ai_usage table (SQL adicional):
 *
 *   CREATE TABLE IF NOT EXISTS public.ai_usage (
 *     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id     uuid NOT NULL,
 *     tier        text NOT NULL,
 *     timestamp   timestamptz NOT NULL DEFAULT NOW(),
 *     tokens_in   int,
 *     tokens_out  int,
 *     latency_ms  int,
 *     cached      boolean DEFAULT false,
 *     source      text,
 *     safety_flag text
 *   );
 *   ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
 *   -- Função SERVICE_ROLE escreve via service role key (config no env Edge).
 */

// @ts-nocheck — esta file roda em Deno (Supabase Edge), não no TypeScript do app
// (TypeScript do app não conhece Deno globals). Excluído do tsconfig do mobile.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

/** Cotas diárias por tier — alinhadas com PREMIUM_STRATEGY.md. */
const DAILY_QUOTA: Record<string, number> = {
  free: 5,
  plus_monthly: 50,
  plus_annual: 50,
  legendary: 200,
};

/** Tokens estimados por turno (cap). */
const MAX_TOKENS_PER_REPLY = 400;

interface ProxyRequest {
  user_id_hash: string;
  tier: 'free' | 'plus_monthly' | 'plus_annual' | 'legendary';
  personality: 'calmo' | 'motivador' | 'fofo' | 'sabio';
  dna_descriptors: string[];
  mood: string;
  message: string;
  context_memories: string[];
  history: Array<{ role: 'user' | 'mascot'; content: string }>;
  safety_flag: 'safe' | 'watch' | 'high' | 'critical';
  language: 'pt' | 'en';
}

const VALID_TIERS = new Set(['free', 'plus_monthly', 'plus_annual', 'legendary']);
const VALID_PERSONALITIES = new Set(['calmo', 'motivador', 'fofo', 'sabio']);
const VALID_SAFETY = new Set(['safe', 'watch', 'high', 'critical']);
const VALID_LANGS = new Set(['pt', 'en']);
const MAX_MESSAGE_LEN = 2000;
const MAX_HISTORY_LEN = 20;
const MAX_MEMORIES = 10;
const MAX_DESCRIPTORS = 20;

function validateRequest(b: unknown): { ok: true; req: ProxyRequest } | { ok: false; reason: string } {
  if (!b || typeof b !== 'object') return { ok: false, reason: 'body_not_object' };
  const r = b as Record<string, unknown>;
  if (typeof r.user_id_hash !== 'string' || r.user_id_hash.length < 8 || r.user_id_hash.length > 128) {
    return { ok: false, reason: 'invalid_user_id_hash' };
  }
  if (typeof r.tier !== 'string' || !VALID_TIERS.has(r.tier)) return { ok: false, reason: 'invalid_tier' };
  if (typeof r.personality !== 'string' || !VALID_PERSONALITIES.has(r.personality)) {
    return { ok: false, reason: 'invalid_personality' };
  }
  if (typeof r.safety_flag !== 'string' || !VALID_SAFETY.has(r.safety_flag)) {
    return { ok: false, reason: 'invalid_safety_flag' };
  }
  if (typeof r.language !== 'string' || !VALID_LANGS.has(r.language)) {
    return { ok: false, reason: 'invalid_language' };
  }
  if (typeof r.message !== 'string' || r.message.trim().length === 0 || r.message.length > MAX_MESSAGE_LEN) {
    return { ok: false, reason: 'invalid_message' };
  }
  if (typeof r.mood !== 'string' || r.mood.length > 64) return { ok: false, reason: 'invalid_mood' };
  if (!Array.isArray(r.dna_descriptors) || r.dna_descriptors.length > MAX_DESCRIPTORS) {
    return { ok: false, reason: 'invalid_dna_descriptors' };
  }
  if (!Array.isArray(r.context_memories) || r.context_memories.length > MAX_MEMORIES) {
    return { ok: false, reason: 'invalid_context_memories' };
  }
  if (!Array.isArray(r.history) || r.history.length > MAX_HISTORY_LEN) {
    return { ok: false, reason: 'invalid_history' };
  }
  for (const h of r.history as unknown[]) {
    if (!h || typeof h !== 'object') return { ok: false, reason: 'invalid_history_item' };
    const hi = h as Record<string, unknown>;
    if (hi.role !== 'user' && hi.role !== 'mascot') return { ok: false, reason: 'invalid_history_role' };
    if (typeof hi.content !== 'string' || hi.content.length > MAX_MESSAGE_LEN) {
      return { ok: false, reason: 'invalid_history_content' };
    }
  }
  return { ok: true, req: r as unknown as ProxyRequest };
}

interface ProxyResponse {
  reply: string;
  source: 'openai' | 'fallback';
  tokens_used: number;
  remaining_quota: number;
  cached: boolean;
}

// In-memory cache (Edge Functions persistem entre invocações da mesma instância)
const responseCache = new Map<string, { reply: string; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_CACHE_ENTRIES = 5000; // proteção contra crescimento ilimitado em instância long-running

function cacheKey(req: ProxyRequest): string {
  // Normaliza mensagem: lowercase + strip pontuação + trim
  const norm = req.message.toLowerCase().replace(/[^\w\s]/g, '').trim();
  // language compõe a chave: "good morning" em PT ≠ "good morning" em EN
  return `${req.language}|${req.personality}|${req.mood}|${norm}`;
}

function cleanCache(): void {
  const now = Date.now();
  for (const [k, v] of responseCache.entries()) {
    if (now - v.ts > CACHE_TTL_MS) responseCache.delete(k);
  }
  // Se ainda acima do limite após TTL purge, remove os mais antigos primeiro
  // (Map preserva insertion order, então iteração inicial = mais antigos).
  if (responseCache.size > MAX_CACHE_ENTRIES) {
    const toRemove = responseCache.size - MAX_CACHE_ENTRIES;
    const keys = responseCache.keys();
    for (let i = 0; i < toRemove; i++) {
      const k = keys.next().value;
      if (k !== undefined) responseCache.delete(k);
    }
  }
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userIdHash: string,
  tier: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const quota = DAILY_QUOTA[tier] ?? DAILY_QUOTA.free;
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userIdHash)
    .gte('timestamp', `${today}T00:00:00Z`);

  if (error) {
    // Em erro de leitura, falha aberto pra não bloquear UX — mas loga.
    console.warn('[proxy] rate_limit_read_error', error.message);
    return { allowed: true, remaining: quota };
  }
  const used = count ?? 0;
  return { allowed: used < quota, remaining: Math.max(0, quota - used) };
}

async function logUsage(
  supabase: ReturnType<typeof createClient>,
  userIdHash: string,
  tier: string,
  meta: {
    tokens_in: number;
    tokens_out: number;
    latency_ms: number;
    cached: boolean;
    source: string;
    safety_flag: string;
  },
): Promise<void> {
  try {
    await supabase.from('ai_usage').insert({
      user_id: userIdHash,
      tier,
      tokens_in: meta.tokens_in,
      tokens_out: meta.tokens_out,
      latency_ms: meta.latency_ms,
      cached: meta.cached,
      source: meta.source,
      safety_flag: meta.safety_flag,
    });
  } catch (e) {
    console.warn('[proxy] log_failed', (e as Error).message);
  }
}

function buildSystemPrompt(req: ProxyRequest): string {
  const personality = req.personality;
  const descriptors = req.dna_descriptors.join(', ') || 'presença equilibrada';
  return `Você é o mascote do usuário — uma criatura digital ${personality} com ${descriptors}.

Princípios invioláveis:
- Tom wellness, gentil, sem julgamento. NUNCA acusatório.
- NUNCA usa vocabulário clínico (depressão, ansiedade clínica, transtorno, diagnóstico).
- NUNCA prescreve. NUNCA promete cura.
- Frases curtas (< 35 palavras).
- Fala em ${req.language === 'pt' ? 'português brasileiro' : 'English'}.
- Memórias relevantes pra contexto: ${req.context_memories.join(' | ') || 'nenhuma'}.

Humor atual da criatura: ${req.mood}.

Responda em primeira pessoa como o mascote, não como assistente.`;
}

async function callOpenAI(
  req: ProxyRequest,
): Promise<{ reply: string; tokens_in: number; tokens_out: number }> {
  if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY not set');
  const systemPrompt = buildSystemPrompt(req);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...req.history.slice(-6).map((h) => ({
      role: h.role === 'mascot' ? 'assistant' : 'user',
      content: h.content,
    })),
    { role: 'user', content: req.message },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        max_tokens: MAX_TOKENS_PER_REPLY,
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI ${res.status}`);
    }
    const data = await res.json();
    const reply = String(data?.choices?.[0]?.message?.content ?? '').trim();
    const usage = data?.usage ?? {};
    return {
      reply,
      tokens_in: Number(usage.prompt_tokens ?? 0),
      tokens_out: Number(usage.completion_tokens ?? 0),
    };
  } finally {
    clearTimeout(timer);
  }
}

function fallbackReply(req: ProxyRequest): string {
  // Reply local minimalista quando OpenAI falha. Cliente também tem fallback
  // próprio, mas este aqui é o "última camada antes do silêncio".
  switch (req.personality) {
    case 'calmo':      return 'Tô aqui. Sem pressa.';
    case 'motivador':  return 'Pequeno passo já conta. Bora.';
    case 'fofo':       return 'Te abraço com palavras.';
    case 'sabio':      return 'O que você sente agora?';
    default:           return 'Estou aqui.';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return new Response(
      JSON.stringify({ error: 'Supabase env missing' }),
      { status: 500, headers: { 'content-type': 'application/json', ...corsHeaders() } },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json' }),
      { status: 400, headers: { 'content-type': 'application/json', ...corsHeaders() } },
    );
  }

  const validation = validateRequest(rawBody);
  if (!validation.ok) {
    return new Response(
      JSON.stringify({ error: 'invalid_body', reason: validation.reason }),
      { status: 400, headers: { 'content-type': 'application/json', ...corsHeaders() } },
    );
  }
  const body: ProxyRequest = validation.req;

  // Refusa critical/high — esses NUNCA vão pra OpenAI (cliente trata local)
  if (body.safety_flag === 'critical' || body.safety_flag === 'high') {
    return new Response(
      JSON.stringify({ error: 'safety_flag_too_high_for_proxy' }),
      { status: 422, headers: { 'content-type': 'application/json', ...corsHeaders() } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const start = Date.now();
  const rl = await checkRateLimit(supabase, body.user_id_hash, body.tier);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: 'rate_limited',
        remaining_quota: 0,
        upgrade_hint: body.tier === 'free' ? 'Plus libera mais turnos diários.' : null,
      }),
      { status: 429, headers: { 'content-type': 'application/json', ...corsHeaders() } },
    );
  }

  // Cache hit?
  cleanCache();
  const ck = cacheKey(body);
  const hit = responseCache.get(ck);
  if (hit) {
    await logUsage(supabase, body.user_id_hash, body.tier, {
      tokens_in: 0,
      tokens_out: 0,
      latency_ms: Date.now() - start,
      cached: true,
      source: 'openai',
      safety_flag: body.safety_flag,
    });
    const out: ProxyResponse = {
      reply: hit.reply,
      source: 'openai',
      tokens_used: 0,
      // Cache hit também conta pra quota (foi logado em ai_usage acima);
      // remaining reflete o estado pós-consumo, igual ao caminho não-cache.
      remaining_quota: Math.max(0, rl.remaining - 1),
      cached: true,
    };
    return new Response(JSON.stringify(out), {
      headers: { 'content-type': 'application/json', ...corsHeaders() },
    });
  }

  // Chama OpenAI
  let reply: string;
  let tokensIn = 0;
  let tokensOut = 0;
  let source: 'openai' | 'fallback' = 'openai';
  try {
    const result = await callOpenAI(body);
    reply = result.reply || fallbackReply(body);
    tokensIn = result.tokens_in;
    tokensOut = result.tokens_out;
    responseCache.set(ck, { reply, ts: Date.now() });
  } catch (err) {
    console.warn('[proxy] openai_failed', (err as Error).message);
    reply = fallbackReply(body);
    source = 'fallback';
  }

  await logUsage(supabase, body.user_id_hash, body.tier, {
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    latency_ms: Date.now() - start,
    cached: false,
    source,
    safety_flag: body.safety_flag,
  });

  const out: ProxyResponse = {
    reply,
    source,
    tokens_used: tokensIn + tokensOut,
    remaining_quota: rl.remaining - 1,
    cached: false,
  };
  return new Response(JSON.stringify(out), {
    headers: { 'content-type': 'application/json', ...corsHeaders() },
  });
});
