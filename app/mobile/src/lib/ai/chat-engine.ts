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
 *
 * IMPORTANTE — Safety: sendChatMessage SEMPRE aplica `evaluateUserMessage`
 * antes de enviar pra OpenAI e `validateAiResponse` no retorno. O fallback
 * path (chat.tsx catch block) depende disso: sem essas guardas, uma mensagem
 * "vou me matar" ia direto pra OpenAI sem CRISIS_REPLY.
 */
import { evaluateUserMessage } from '@/ai/SafetyRules';
import { validateAiResponse } from '@/ai/AIResponseValidator';
import { classifyIntent, mockReply } from '@/content/replies';
import { SAFE_FALLBACK } from '@/content/safety';
import { logger } from '@/lib/logger';
import type { Personality, SafetyFlag } from '@/types';
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
  // Flag de safety da decisão de input (ou da validação de output). O caller
  // (chat.tsx, fallback path) PRECISA persistir isto — antes hardcodava 'safe',
  // então um CRISIS_REPLY vindo do fallback era gravado como 'safe' e a UI de
  // crise (estilo do ChatBubble, supressão do rating) não disparava.
  safetyFlag: SafetyFlag;
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
      safetyFlag: 'safe',
    };
  }

  // SAFETY GATE — input: bloqueia crise/diagnóstico antes de chegar na OpenAI.
  // Sem esse gate, "vou me matar" ia direto pro modelo (e poderia escapar
  // o CRISIS_REPLY canônico). Equivalente ao gate em generateReply.
  const inputDecision = evaluateUserMessage(trimmed);
  if (!inputDecision.allowed && inputDecision.redirect) {
    // Crise (critical) ou diagnóstico (watch) — a flag PRECISA chegar no caller
    // pra UI de crise disparar. Esse é exatamente o path que o fallback de
    // chat.tsx usa quando generateReply quebra.
    return { content: inputDecision.redirect, source: 'local', safetyFlag: inputDecision.flag };
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
      safetyFlag: inputDecision.flag,
    };
  }

  try {
    const systemPrompt = buildSystemPrompt({
      personality: asPromptPersonality(opts.personality),
      // Mapeia mascotName -> identity quando o caller (chat.tsx) só passa o nome.
      // Antes o nome era ignorado e o prompt sempre dizia "Você é Pip", então um
      // mascote renomeado se apresentava como Pip no fallback local.
      identity: opts.identity ?? (opts.mascotName ? { name: opts.mascotName } : undefined),
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
    // SAFETY GATE — output: passa pela validação canônica antes de devolver.
    // Diagnose acidental, prescrições, markup proibido viram SAFE_FALLBACK
    // ou CRISIS_REPLY conforme o tipo de violação.
    const validated = validateAiResponse({ reply, safety_flag: 'safe' }, inputDecision.flag);
    // source='local' SÓ quando a validação REJEITOU o reply (substituiu por
    // SAFE_FALLBACK/CRISIS_REPLY). Antes checava `safety_flag !== 'safe'`, então
    // um flag 'watch' HERDADO do input (ex.: user citou "ansiedade") num reply
    // VÁLIDO da OpenAI era rotulado 'local' e a UI mostrava "modo local" numa
    // resposta real da nuvem. `validated.valid` distingue rejeição de flag herdado.
    return {
      content: validated.reply,
      source: validated.valid ? 'openai' : 'local',
      safetyFlag: validated.safety_flag,
    };
  } catch (err) {
    // NUNCA logar o erro inteiro — pode conter o Request com Authorization
    // header e vazar a API key. Só a mensagem (que o SDK normaliza).
    const reason = err instanceof Error ? err.message : 'unknown';
    logger.warn('[chat-engine] OpenAI failed, falling back to local', { reason });
    const intent = classifyIntent(trimmed);
    return {
      content: mockReply(opts.personality, intent, opts.mascotName) ?? SAFE_FALLBACK,
      source: 'local',
      safetyFlag: inputDecision.flag,
    };
  }
}
