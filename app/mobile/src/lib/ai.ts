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
import {
  aiSourceFromResponse,
  trackAiReplyFailed,
  trackAiReplyRequested,
  trackAiReplySucceeded,
} from '@/analytics/trackAiReply';
import { localSubscriptionRepo } from '@/repositories/local';
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
  if (typeof apiKeyOrOptions === 'string' || apiKeyOrOptions === undefined) {
    apiKey = apiKeyOrOptions;
  } else {
    apiKey = apiKeyOrOptions.apiKey;
    mascotName = apiKeyOrOptions.mascotName;
    userId = apiKeyOrOptions.userId;
    history = apiKeyOrOptions.history ?? history;
    dna = apiKeyOrOptions.dna;
  }
  return generateReplyInternal(personality, userMessage, apiKey, history, mascotName, userId, dna);
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
  // o flag mais severo entre todos os sinais. Ainda assim chamamos
  // `classifyInput` de novo e fusionamos via `moreSevere` por defense-in-depth:
  // se o ensemble mudar no futuro (e.g., comecar a downgradear severidade),
  // a regex legacy continua sendo um piso inferior garantido. Custo: ~1ms.
  const safety = classifySafetyEnsemble(userMessage);
  const legacyFlag = classifyInput(userMessage);
  const inputFlag = moreSevere(safety.flag, legacyFlag);
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
      // Passa flag classificado pelo cliente — backend usa pra audit log e
      // bloqueia se for high/critical (defesa em profundidade; já filtramos
      // acima, mas o backend confere de novo).
      safetyFlag: inputFlag,
      language: 'pt',
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
      return finish({ reply: validation.reply, safety_flag: inputFlag, source: 'openai', usage }, false);
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
        max_tokens: 100,
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
