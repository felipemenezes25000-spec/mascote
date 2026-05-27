/**
 * Chat engine v2 — entry point unificado: tenta OpenAI direto (BYOK) e cai
 * pro mock local em qualquer falha (sem chave, erro de rede, resposta vazia).
 *
 * Esta camada é ADITIVA em relação ao `src/lib/ai.ts` (generateReply), que
 * continua sendo o pipeline canônico com proxy + safety + guards.
 * `sendChatMessage` é o adapter "simples" para callers que precisam só de
 * uma resposta de texto e o source para a UI exibir o badge "modo local".
 *
 * Quando há proxy oficial no ar, prefira `generateReply` (já trata proxy,
 * recall, anti-repeat e guards). Use `sendChatMessage` para integrações
 * leves ou testes onde só a resposta de texto importa.
 */
import { classifyIntent, mockReply } from '@/content/replies';
import type { Personality } from '@/types';
import { getOpenAI } from './openai-client';
import { buildSystemPrompt, type SystemPromptPersonality } from './system-prompt';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export interface SendOptions {
  history?: ChatMessage[];
  personality: Personality;
  identity?: { name?: string; level?: number; archetype?: string };
  memories?: Array<{ summary: string }>;
  mascotName?: string;
}

export interface SendResult {
  content: string;
  source: 'openai' | 'local';
}

// Personalidades do replies.ts batem 1:1 com as do system-prompt.ts (calmo,
// motivador, fofo, sabio). Guard de tipo pra catch silencioso se algum dia
// divergir (e.g., personality nova entrar só num lado).
function asPromptPersonality(p: Personality): SystemPromptPersonality {
  if (p === 'calmo' || p === 'motivador' || p === 'fofo' || p === 'sabio') return p;
  // fallback defensivo — `sabio` é o mais neutro.
  /* v8 ignore next 1 */
  return 'sabio';
}

export async function sendChatMessage(text: string, opts: SendOptions): Promise<SendResult> {
  const trimmed = text?.trim();
  if (!trimmed) {
    // Mensagem vazia — entrega resposta default local sem chamar IA.
    return {
      content: mockReply(opts.personality, classifyIntent(''), opts.mascotName),
      source: 'local',
    };
  }

  let openai: Awaited<ReturnType<typeof getOpenAI>>;
  try {
    openai = await getOpenAI();
  } catch {
    openai = null;
  }

  if (!openai) {
    const intent = classifyIntent(trimmed);
    return {
      content: mockReply(opts.personality, intent, opts.mascotName),
      source: 'local',
    };
  }

  try {
    const systemPrompt = buildSystemPrompt({
      personality: asPromptPersonality(opts.personality),
      identity: opts.identity,
      memories: opts.memories,
      historyPreamble: '',
    });
    const history = (opts.history ?? []).slice(-8);
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: trimmed },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });
    const reply = res.choices[0]?.message?.content?.trim();
    if (!reply) throw new Error('Empty response');
    return { content: reply, source: 'openai' };
  } catch (err) {
    // NUNCA logar o erro inteiro — pode conter o Request com Authorization
    // header e vazar a API key. Só a mensagem (que o SDK normaliza).
    const reason = err instanceof Error ? err.message : 'unknown';
    console.warn('[chat-engine] OpenAI failed, falling back to local:', reason);
    const intent = classifyIntent(trimmed);
    return {
      content: mockReply(opts.personality, intent, opts.mascotName),
      source: 'local',
    };
  }
}
