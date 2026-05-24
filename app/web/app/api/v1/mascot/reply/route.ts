/**
 * Proxy mínimo de IA — POST /api/v1/mascot/reply
 * Chave OpenAI fica server-side (OPENAI_API_KEY). Rate limit básico por IP.
 */

import { NextRequest, NextResponse } from 'next/server';

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count += 1;
  return true;
}

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

  const system =
    body.system_prompt?.trim() ??
    `Você é um mascote digital de bem-estar. Tom: ${body.personality_flavor ?? 'caloroso e leve'}. Não diagnostique. Não prometa cura.`;

  const messages = [
    { role: 'system' as const, content: system },
    ...(body.history ?? []).slice(-8).map(h => ({
      role: (h.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: String(h.content ?? ''),
    })),
    { role: 'user' as const, content: userMessage },
  ];

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
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };
    const reply = data.choices?.[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({
      reply,
      safety_flag: 'none',
      usage: data.usage,
    });
  } catch {
    return NextResponse.json({ error: 'proxy_failure' }, { status: 502 });
  }
}
