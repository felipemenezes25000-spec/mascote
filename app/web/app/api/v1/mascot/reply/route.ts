/**
 * Proxy mínimo de IA — POST /api/v1/mascot/reply
 * Chave OpenAI fica server-side (OPENAI_API_KEY). Rate limit básico por IP.
 */

import { NextRequest, NextResponse } from 'next/server';

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
type SafetyFlag = 'safe' | 'watch' | 'high' | 'critical';

interface ReplyBody {
  personality?: string;
  message?: string;
  history?: Array<{ role: string; content: string }>;
  system_prompt?: string;
  personality_flavor?: string;
  recent_replies?: string[];
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'rate_limit' }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'proxy_not_configured' }, { status: 503 });
  }

  let body: ReplyBody;
  try {
    body = (await req.json()) as ReplyBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const userMessage = body.message?.trim();
  if (!userMessage) {
    return NextResponse.json({ error: 'message_required' }, { status: 400 });
  }
  if (userMessage.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: 'message_too_long' }, { status: 400 });
  }

  const system =
    body.system_prompt?.trim() ??
    `Você é um mascote digital de bem-estar. Tom: ${body.personality_flavor ?? 'caloroso e leve'}. Não diagnostique. Não prometa cura.`;

  const history = Array.isArray(body.history) ? body.history : [];
  const messages = [
    { role: 'system' as const, content: system },
    ...history.slice(-MAX_HISTORY_ITEMS).map(h => ({
      role: (h?.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: String(h?.content ?? '').slice(0, MAX_MESSAGE_CHARS),
    })),
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
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };
    const reply = data.choices?.[0]?.message?.content?.trim() ?? '';
    // Contrato com mobile (AIResponseValidator) exige flag = 'safe' | 'watch'
    // | 'high' | 'critical'. Antes retornávamos 'none', que cai no fallback
    // mas ainda assim sujava a telemetria. O mobile vai recomputar via
    // classifyInput pra reforçar, então 'safe' aqui é só o default neutro.
    const safetyFlag: SafetyFlag = 'safe';
    return NextResponse.json({
      reply,
      safety_flag: safetyFlag,
      usage: data.usage,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      { error: isAbort ? 'upstream_timeout' : 'proxy_failure' },
      { status: isAbort ? 504 : 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
