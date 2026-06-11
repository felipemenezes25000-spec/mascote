/**
 * Proxy mínimo de IA — POST /api/v1/mascot/reply
 * Chave OpenAI fica server-side (OPENAI_API_KEY). Rate limit básico por IP.
 */

import { NextRequest, NextResponse } from 'next/server';

// Runtime explícito + budget de execução. Hobby ignora maxDuration (10s teto);
// Pro/Enterprise respeita até 300s. Mantemos 25 para dar headroom acima do
// OPENAI_TIMEOUT_MS sem encostar no teto do plano.
export const runtime = 'nodejs';
export const maxDuration = 25;
export const dynamic = 'force-dynamic';

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
// Capped: o Map vivia para sempre num processo long-running e era um vetor
// de OOM trivial (qualquer ataque com IPs únicos enchia memória). Em
// ambiente serverless o counter é por-instância — defesa real fica no
// reverse-proxy/Cloudflare; este aqui é só best-effort dentro do warm pool.
const RATE_MAX_KEYS = 10_000;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    if (ipHits.size >= RATE_MAX_KEYS) {
      // Evict oldest insertion (Map preserva ordem). Sem isso, basta um
      // burst de IPs únicos pra consumir RAM até o crash.
      const oldest = ipHits.keys().next().value;
      if (oldest !== undefined) ipHits.delete(oldest);
    }
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count += 1;
  return true;
}

const OPENAI_TIMEOUT_MS = 20_000;
const MAX_HISTORY_ITEMS = 16;
const MAX_MESSAGE_CHARS = 4_000;
// Caps defensivos contra abuso de tokens (custo OpenAI = $$$). Mobile envia
// system_prompt construído com DNA + memórias; ~8KB cobre o cenário real com
// folga. personality_flavor é uma frase curta — 200 chars é generoso.
const MAX_SYSTEM_CHARS = 8_000;
const MAX_FLAVOR_CHARS = 200;

type SafetyFlag = 'safe' | 'watch' | 'high' | 'critical';

interface ReplyBody {
  personality?: unknown;
  message?: unknown;
  history?: unknown;
  system_prompt?: unknown;
  personality_flavor?: unknown;
  recent_replies?: unknown;
}

// Coerção segura: aceita string, retorna string trim. Qualquer outro tipo
// (number/object/array/null) → string vazia. Evita TypeError ao chamar
// `.trim()` em valores que o caller jurou que seriam string.
function asStr(v: unknown, maxLen = MAX_MESSAGE_CHARS): string {
  if (typeof v !== 'string') return '';
  const trimmed = v.trim();
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

function pickClientIp(req: NextRequest): string {
  // Vercel/Cloudflare convention. XFF é confiável apenas atrás de proxy
  // confiável — em produção atrás de Vercel, o leftmost é o cliente real.
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real;
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  return 'unknown';
}

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

function json<T>(body: T, status = 200, extraHeaders?: Record<string, string>): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: extraHeaders ? { ...NO_STORE_HEADERS, ...extraHeaders } : NO_STORE_HEADERS,
  });
}

// RFC 9110 § 10.2.3 — clientes (mobile AIRateLimiter) usam pra backoff
// correto em vez de retry imediato.
const RATE_LIMIT_RETRY_AFTER_SECONDS = Math.ceil(RATE_WINDOW_MS / 1000);

export async function POST(req: NextRequest) {
  const ip = pickClientIp(req);
  if (!rateLimit(ip)) {
    return json({ error: 'rate_limit' }, 429, { 'Retry-After': String(RATE_LIMIT_RETRY_AFTER_SECONDS) });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return json({ error: 'proxy_not_configured' }, 503);
  }

  let body: ReplyBody;
  try {
    body = (await req.json()) as ReplyBody;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!body || typeof body !== 'object') {
    return json({ error: 'invalid_body' }, 400);
  }

  const userMessage = asStr(body.message, MAX_MESSAGE_CHARS);
  if (!userMessage) {
    return json({ error: 'message_required' }, 400);
  }
  // Mantemos a checagem explícita de tamanho original (mensagens > MAX são
  // truncadas por asStr, mas queremos sinalizar pra mobile com 400).
  if (typeof body.message === 'string' && body.message.trim().length > MAX_MESSAGE_CHARS) {
    return json({ error: 'message_too_long' }, 400);
  }

  const flavor = asStr(body.personality_flavor, MAX_FLAVOR_CHARS) || 'caloroso e leve';
  const customSystem = asStr(body.system_prompt, MAX_SYSTEM_CHARS);
  const system =
    customSystem ||
    `Você é um mascote digital de bem-estar. Tom: ${flavor}. Não diagnostique. Não prometa cura.`;

  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history = rawHistory
    .slice(-MAX_HISTORY_ITEMS)
    .map(h => {
      const item = h as { role?: unknown; content?: unknown } | null;
      const role: 'user' | 'assistant' = item?.role === 'assistant' ? 'assistant' : 'user';
      const content = asStr(item?.content, MAX_MESSAGE_CHARS);
      return { role, content };
    })
    .filter(m => m.content.length > 0);

  const messages = [
    { role: 'system' as const, content: system },
    ...history,
    { role: 'user' as const, content: userMessage },
  ];

  // AbortController evita request pendurada queimando memória do worker
  // e o budget de billing da OpenAI quando o upstream trava.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages,
        max_tokens: 280,
        temperature: 0.85,
      }),
      signal: controller.signal,
      // Next 14 não cacheia POST por padrão, mas explicit blinda contra
      // futura mudança / refactor que mude o verbo.
      cache: 'no-store',
    });

    if (!res.ok) {
      // Log mínimo (sem PII / sem header de auth) pra observabilidade. Em
      // serverless, console.warn vai parar nos logs da plataforma (Vercel).
      console.warn('[mascot/reply] upstream non-ok', { status: res.status });
      // Pass-through de 429 ajuda o mobile a backoff específico. Reflete
      // Retry-After do upstream (OpenAI manda) se presente — caso contrário
      // usamos um default conservador.
      if (res.status === 429) {
        const upstreamRetryAfter = res.headers.get('retry-after')?.trim();
        const retryAfter = upstreamRetryAfter && /^\d+$/.test(upstreamRetryAfter)
          ? upstreamRetryAfter
          : String(RATE_LIMIT_RETRY_AFTER_SECONDS);
        return json({ error: 'upstream_rate_limit' }, 429, { 'Retry-After': retryAfter });
      }
      return json({ error: 'upstream_error' }, 502);
    }

    let data: {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };
    try {
      data = await res.json();
    } catch {
      console.warn('[mascot/reply] upstream returned non-json');
      return json({ error: 'upstream_invalid_json' }, 502);
    }

    const reply = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!reply) {
      // Antes retornávamos 200 com reply vazio — mobile cai pro fallback mas
      // server log marca como sucesso, mascarando o problema. 502 expõe.
      console.warn('[mascot/reply] upstream returned empty completion');
      return json({ error: 'upstream_empty' }, 502);
    }
    // Contrato com mobile (AIResponseValidator) exige flag = 'safe' | 'watch'
    // | 'high' | 'critical'. Antes retornávamos 'none', que cai no fallback
    // mas ainda assim sujava a telemetria. O mobile vai recomputar via
    // classifyInput pra reforçar, então 'safe' aqui é só o default neutro.
    const safetyFlag: SafetyFlag = 'safe';
    return json({
      reply,
      safety_flag: safetyFlag,
      usage: data.usage,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    if (isAbort) {
      console.warn('[mascot/reply] upstream timeout');
    } else {
      console.warn('[mascot/reply] proxy failure', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
    }
    return json(
      { error: isAbort ? 'upstream_timeout' : 'proxy_failure' },
      isAbort ? 504 : 502,
    );
  } finally {
    clearTimeout(timer);
  }
}

// Handlers explícitos pra métodos não-POST e preflight. Sem isso, Next.js
// devolve 405 mas sem Cache-Control e sem CORS — alguns CDNs cacheiam o 405
// e o método correto começa a retornar stale.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...NO_STORE_HEADERS, Allow: 'POST, OPTIONS' },
  });
}

export async function GET() {
  // 405 sem Allow header viola RFC 9110 § 15.5.6 e alguns proxies caem em
  // loop de retry. no-store já está em json(); adicionamos Allow no merge.
  return NextResponse.json(
    { error: 'method_not_allowed' },
    { status: 405, headers: { ...NO_STORE_HEADERS, Allow: 'POST, OPTIONS' } },
  );
}
