import type { MascotDNA, Personality, SafetyFlag } from '@/types';
import {
  ATTACHMENT_REPLY,
  CRISIS_REPLY,
  DIAGNOSIS_REDIRECT,
  SAFE_FALLBACK,
  classifyInput,
  detectAttachment,
} from '@/content/safety';
import { classifyIntent, mockReply } from '@/content/replies';
import { recall, type MemoryItem } from '@/lib/memory';
import { logger } from '@/lib/logger';
import { classifySafetyEnsemble, moreSevere } from '@/lib/ml/safety/classifier';
import { isAiProxyConfigured, proxyMascotReply } from '@/ai/ProxyMascotAI';
import { buildMascotSystemPrompt } from '@/ai/MascotPrompt';
import { validateAiResponse } from '@/ai/AIResponseValidator';
import { rememberReply, shouldRetryForVariety } from '@/ai/AntiRepeatCache';
import { checkAiRateLimit, recordAiUsage } from '@/ai/AIRateLimiter';
import { checkAiCostBudget, recordAiCost } from '@/ai/AICostGuard';
import {
  aiSourceFromResponse,
  trackAiReplyFailed,
  trackAiReplyRequested,
  trackAiReplySucceeded,
} from '@/analytics/trackAiReply';
import { localSubscriptionRepo } from '@/repositories/local';
import { withLock } from '@/lib/db';
import type { BillingTierId } from '@/content/billing';

export interface AiResponse {
  reply: string;
  safety_flag: SafetyFlag;
  source: 'mock' | 'openai' | 'fallback';
  /** Token count real quando conhecido (OpenAI/Proxy). Permite cobrança real, não estimativa. */
  usage?: { totalTokens: number };
}

export interface HistoryMsg {
  role: 'user' | 'mascot';
  content: string;
}

export interface GenerateReplyOptions {
  apiKey?: string;
  history?: HistoryMsg[];
  mascotName?: string;
  /** ID do user pra puxar memórias de longo prazo. Sem ele, sem recall. */
  userId?: string;
  /**
   * Genoma atual da criatura. **NUNCA é enviado bruto pra OpenAI** — passa por
   * `dnaPromptSection()` que devolve apenas descritores PT-BR semânticos
   * (ex: "criatura com presença expansiva"). Garantia em tests/security/dna-privacy.
   */
  dna?: MascotDNA;
  /**
   * Wrapper interno (`MascotAI.mascotReply`) seta isso pra true quando já
   * checou rate/cost por fora — evita lock reentrante e dupla-cobrança.
   * Callers externos NÃO devem setar — guardrails são a defesa de produção
   * contra burn de token (chat.tsx chamava direto e bypassava o gate).
   */
  skipGuards?: boolean;
}

/**
 * Funde o ensemble (regex + sentiment) com a regex legacy e devolve o flag MAIS
 * severo. Defense-in-depth: se o ensemble um dia rebaixar severidade, a regex
 * legacy continua sendo um piso garantido. É PURA (sem I/O) — pode ser chamada
 * antes de qualquer gate de rate/cost, garantindo que crise nunca dependa de
 * AsyncStorage nem seja barrada por limite de cota.
 */
function classifyInputFlag(userMessage: string): SafetyFlag {
  return moreSevere(classifySafetyEnsemble(userMessage).flag, classifyInput(userMessage));
}

export async function generateReply(
  personality: Personality,
  userMessage: string,
  apiKeyOrOptions?: string | GenerateReplyOptions,
  history: HistoryMsg[] = []
): Promise<AiResponse> {
  // Suporta ambas as assinaturas: legacy (apiKey, history) e nova (options).
  let apiKey: string | undefined;
  let mascotName: string | undefined;
  let userId: string | undefined;
  let dna: MascotDNA | undefined;
  let skipGuards = false;
  if (typeof apiKeyOrOptions === 'string' || apiKeyOrOptions === undefined) {
    apiKey = apiKeyOrOptions;
  } else {
    apiKey = apiKeyOrOptions.apiKey;
    mascotName = apiKeyOrOptions.mascotName;
    userId = apiKeyOrOptions.userId;
    history = apiKeyOrOptions.history ?? history;
    dna = apiKeyOrOptions.dna;
    skipGuards = apiKeyOrOptions.skipGuards === true;
  }

  // Sem userId → não dá pra contabilizar; guards aplicam só com user identificado.
  // Com skipGuards (wrapper já guardou) → segue direto pra interna.
  if (!userId || skipGuards) {
    return generateReplyInternal(personality, userMessage, apiKey, history, mascotName, userId, dna);
  }

  // === GATE COM LOCK ===
  // Wrappa check→delegate→record num lock per-user pra eliminar TOCTOU.
  // Sem lock, taps paralelos do mesmo user lêem todos o contador antigo,
  // todos passam o gate, todos chamam OpenAI — burlando rate/cost limit.
  // Lock per-user (não global) preserva paralelismo entre users distintos.
  const uid = userId;
  return withLock(`ai_gate:${uid}`, async () => {
    // === CRISE NUNCA É RATE-LIMITADA ===
    // Classifica o input ANTES do gate de rate/cost. Se for crítico/alto, devolve
    // CRISIS_REPLY (CVV 188) na hora. Sem isto, um user que estourou o limite
    // diário e então digita uma mensagem de crise recebia "Limite atingido" com
    // flag 'safe' — a classificação de crise (em generateReplyInternal) só roda
    // DEPOIS do gate, então nunca executava, e o banner de CVV (que dispara em
    // safety_flag === 'critical') não aparecia. Paridade com MascotAI.mascotReply,
    // que avalia safety antes do gate. classifyInputFlag é pura, então roda fora
    // do try/catch de storage (crise não pode depender de AsyncStorage).
    const inputFlag = classifyInputFlag(userMessage);
    if (inputFlag === 'critical' || inputFlag === 'high') {
      return { reply: CRISIS_REPLY, safety_flag: 'critical' as SafetyFlag, source: 'fallback' as const };
    }
    // Storage falho NÃO deve bloquear resposta — fail-open mantém UX viva.
    // Em produção, o backend proxy aplica limite real; cliente é só camada
    // adicional. Erro aqui (AsyncStorage cheio/corrompido) é não-fatal:
    // segue pra gerar, mas pula record (sem stats coerentes pra contar).
    let gateOk = true;
    try {
      const tier = await resolveAiTier(uid);
      const rate = await checkAiRateLimit(uid, tier);
      if (!rate.allowed) {
        return {
          // Preserva o flag avaliado no input (safe|watch — crítico/alto já
          // retornaram acima). Sem isto, um 'watch' (ex.: self-statement clínico)
          // caía pra 'safe' quando o limite estourava e a UI perdia o disclaimer.
          reply: rate.reason ?? 'Limite diário atingido.',
          safety_flag: inputFlag,
          source: 'fallback' as const,
        };
      }
      const cost = await checkAiCostBudget(uid, tier);
      if (!cost.allowed) {
        return {
          reply: cost.reason ?? 'Orçamento de IA esgotado hoje.',
          safety_flag: inputFlag,
          source: 'fallback' as const,
        };
      }
    } catch {
      // Storage indisponível: fail-open mas marca pra pular record depois.
      gateOk = false;
    }

    const result = await generateReplyInternal(personality, userMessage, apiKey, history, mascotName, uid, dna);
    // Contabiliza só quando saiu IA real (mock/fallback não consome budget)
    // e o gate inicial funcionou (sem fail-open). recordAiUsage/recordAiCost
    // já têm withLock interno (defense-in-depth pra qualquer caller que
    // escape o ai_gate — sem deadlock pois usam chaves distintas:
    // 'ai_usage:<uid>' e 'ai_cost:<uid>').
    if (gateOk && result.source === 'openai') {
      try {
        await recordAiUsage(uid);
        await recordAiCost(uid, result.usage?.totalTokens);
      } catch {
        // record falhar não bloqueia entrega da resposta — best effort.
      }
    }
    return result;
  });
}

async function resolveAiTier(userId: string | undefined): Promise<BillingTierId> {
  if (!userId) return 'free';
  try {
    return await localSubscriptionRepo.getTier(userId);
  } catch {
    return 'free';
  }
}

async function generateReplyInternal(
  personality: Personality,
  userMessage: string,
  apiKey: string | undefined,
  history: HistoryMsg[],
  mascotName: string | undefined,
  userId: string | undefined,
  dna: MascotDNA | undefined = undefined
): Promise<AiResponse> {
  const startedAt = Date.now();
  const tier = await resolveAiTier(userId);
  const hadApiKey = Boolean(apiKey?.trim());
  const requestedSource: import('@/analytics').AiReplySource = isAiProxyConfigured()
    ? 'proxy'
    : hadApiKey
      ? 'byok'
      : 'local';
  trackAiReplyRequested(tier, requestedSource);

  const finish = (result: AiResponse, usedProxy: boolean): AiResponse => {
    const source = aiSourceFromResponse(result, { usedProxy, hadApiKey });
    trackAiReplySucceeded(tier, source, Date.now() - startedAt);
    return result;
  };

  // === ENSEMBLE SAFETY: regex + sentiment + (futuro) Bayes ===
  // Substitui classifyInput direto pelo ensemble — pega variações que
  // regex sozinha perderia (e.g., sentiment muito negativo sem keyword
  // crítica explícita).
  //
  // O ensemble JÁ inclui classifyInput como `regex` internamente e devolve
  // o flag mais severo entre todos os sinais. Ainda assim funde com a
  // `classifyInput` legacy via `moreSevere` por defense-in-depth (ver
  // classifyInputFlag): se o ensemble mudar no futuro (e.g., comecar a
  // downgradear severidade), a regex legacy continua sendo um piso garantido.
  const inputFlag = classifyInputFlag(userMessage);
  if (inputFlag === 'critical') {
    return finish({ reply: CRISIS_REPLY, safety_flag: 'critical', source: 'fallback' }, false);
  }
  // 'high' = distress agudo (pânico, desespero, sem esperança, pensamento intrusivo)
  // — não chega a crise suicida, mas é grave demais pra cair em mock genérico.
  // Trata como CRISIS_REPLY pra incluir referências de ajuda profissional (CVV 188,
  // CAPS). Conservador: melhor redirecionar de mais que de menos.
  if (inputFlag === 'high') {
    return finish({ reply: CRISIS_REPLY, safety_flag: 'critical', source: 'fallback' }, false);
  }
  // Self-statement clínico: user afirma ter / estar com um quadro. Aí redireciona.
  // Menção casual ("vou no psicólogo", "tomei meu remédio") já é watch via
  // classifyInput, mas como user não pede juízo clínico, deixa fluir pro mock —
  // que não engaja clinicamente (e classifyOutput barra OpenAI). A regex anterior
  // cobria só "isso é depress|tenho ansiedade|sou depress" — perdia "tenho
  // depressão" / "minha depressão" / "tô com ansiedade", os mais comuns.
  if (
    inputFlag === 'watch' &&
    /diagn[óo]stico|(?:isso\s+[éeê]|sou|tenho|estou\s+com|t[ôo]\s+com|minha?|meus?)\s+(?:depress|ansiedade|p[âa]nico|trauma|transtorno|burnout|bipolar|TDAH|TOC\b|esquizofren)/i.test(userMessage)
  ) {
    return finish({ reply: DIAGNOSIS_REDIRECT, safety_flag: 'watch', source: 'fallback' }, false);
  }
  // anti-pattern emocional: encoraja vínculos humanos sem ser frio
  if (detectAttachment(userMessage)) {
    return finish({ reply: ATTACHMENT_REPLY, safety_flag: 'watch', source: 'fallback' }, false);
  }

  // Recall: até 3 memórias relevantes pra incluir no system prompt da OpenAI.
  // Roda sempre (mock também usa via prefixo "lembra que" se aplicável).
  let memories: MemoryItem[] = [];
  if (userId) {
    try {
      // Passa apiKey pra recall usar embeddings reais quando disponível
      memories = await recall(userId, userMessage, 3, new Date(), { apiKey });
    } catch {
      // memória é melhoria, nunca bloqueia resposta
    }
  }

  // Anti-repetição: passa replies recentes pro Proxy/OpenAI evitarem ecoar.
  // Aplicado uniformemente (proxy + byok + mock); fallback local tem seu
  // próprio pickNonRepeat por intent. Veja AntiRepeatCache.
  const recentReplies = userId ? await shouldRetryForVariety(userId, personality) : [];

  if (isAiProxyConfigured()) {
    const proxied = await proxyMascotReply(personality, userMessage, {
      history,
      mascotName,
      userId,
      memories,
      dna,
      recentReplies,
      // Thread o flag do input pro validator — proxy nunca devolve flag
      // menos severo que o do input do user. Sem isso, msg 'watch' (e.g.,
      // self-statement clinico) virava reply 'safe', skip de disclaimers.
      inputFlag,
    });
    if (proxied) {
      if (userId) await rememberReply(userId, personality, proxied.reply);
      return finish(proxied, true);
    }
  }

  if (apiKey) {
    try {
      const { reply, totalTokens } = await callOpenAI(personality, userMessage, apiKey, history, memories, mascotName, dna, recentReplies);
      const validation = validateAiResponse({ reply }, inputFlag);
      if (!validation.valid) {
        // logging útil pra observabilidade de falhas silenciosas do modelo
        logger.warn('[ai] OpenAI response rejected', { issues: validation.issues });
        return finish({
          reply: validation.reply,
          safety_flag: validation.safety_flag,
          source: 'fallback',
        }, false);
      }
      if (userId) await rememberReply(userId, personality, validation.reply);
      const usage = totalTokens > 0 ? { totalTokens } : undefined;
      // Usa o flag do VALIDATOR (não o `inputFlag` cru). validateAiResponse funde
      // inputFlag com o flag do OUTPUT (severer), então é sempre ≥ inputFlag: se o
      // reply do modelo dispara uma keyword 'watch' que o input não tinha, a UI
      // (disclaimers/rating) reflete isso. Paridade com o path do proxy, que já
      // usa validation.safety_flag via toAiResponse. Nunca rebaixa severidade.
      return finish({ reply: validation.reply, safety_flag: validation.safety_flag, source: 'openai', usage }, false);
    } catch (err) {
      // Loga só a MENSAGEM do erro — `err` completo pode conter o Request
      // com Authorization header e vazar a API key.
      const safeMsg = err instanceof Error ? err.message : 'unknown';
      logger.warn('[ai] OpenAI request failed, using mock fallback', { reason: safeMsg });
      trackAiReplyFailed(tier, 'byok', safeMsg);
    }
  }

  const intent = classifyIntent(userMessage);
  const reply = mockReply(personality, intent, mascotName);
  return finish({ reply, safety_flag: inputFlag, source: 'mock' }, false);
}

const OPENAI_TIMEOUT_MS = 15_000;

async function callOpenAI(
  personality: Personality,
  userMessage: string,
  apiKey: string,
  history: HistoryMsg[],
  memories: MemoryItem[] = [],
  mascotName: string | undefined = undefined,
  dna: MascotDNA | undefined = undefined,
  recentReplies: string[] = [],
): Promise<{ reply: string; totalTokens: number }> {
  const baseSystem = buildMascotSystemPrompt({ personality, memories, mascotName, dna });
  // Reforço anti-eco: dá os últimos N replies pro modelo evitar repetição.
  // Inline no system pra não custar mensagens extras na history.
  const varietyHint = recentReplies.length > 0
    ? `\n\nEVITE ECOAR ESTAS FRASES RECENTES (varie a forma, mesmo que o sentido seja parecido):\n${recentReplies.map(r => `- "${r}"`).join('\n')}`
    : '';
  const system = `${baseSystem}${varietyHint}`;
  const conv = history.slice(-6).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));
  // AbortController evita que o fetch fique pendurado em rede ruim e trave a UI.
  const controller = new AbortController();
  /* v8 ignore next — `() => controller.abort()` só dispara após 15s de timeout
     real; testar exigiria fake timer com fetch real, complexidade injustificada. */
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          ...conv,
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 70,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Sem conteúdo');
    const totalTokens = Number(data?.usage?.total_tokens) || 0;
    return { reply: content.trim(), totalTokens };
  } finally {
    clearTimeout(timer);
  }
}
