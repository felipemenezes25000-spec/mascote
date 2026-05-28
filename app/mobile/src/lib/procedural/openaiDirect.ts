/**
 * Caminho DEV-only: chama OpenAI Chat Completions diretamente, sem proxy.
 *
 * Usado quando `EXPO_PUBLIC_AI_PROXY_URL` não está configurado MAS
 * `EXPO_PUBLIC_OPENAI_API_KEY` está e `EXPO_PUBLIC_ENV !== 'production'`.
 *
 * Em produção isto NUNCA roda — `runtime-config.assertProductionConfig`
 * bloqueia `EXPO_PUBLIC_OPENAI_API_KEY` no bundle final (chave seria
 * extraível do APK por qualquer reverse-engineering).
 *
 * Custo: ~1500 tokens por chamada × gpt-4o-mini ($0.15/M in, $0.6/M out)
 * ≈ $0.001 por geração. Negligível pra dev e tests.
 */

import type { GenerateInput } from './generate';
import type { ProceduralGenome } from '@/types';
import { logger } from '@/lib/logger';
import { validateProceduralGenome } from './schema';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const TIMEOUT_MS = 30_000;

function getOpenAIKey(): string | undefined {
  const k = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim();
  return k && k.length > 10 ? k : undefined;
}

function isProductionEnv(): boolean {
  const env = (process.env.EXPO_PUBLIC_ENV ?? '').toLowerCase();
  return env === 'production' || env === 'prod';
}

export function canCallOpenAIDirect(): boolean {
  // Hard gate: NUNCA em produção mesmo se as duas vars existirem.
  if (isProductionEnv()) return false;
  return !!getOpenAIKey();
}

const SYSTEM_PROMPT = `Você gera "ProceduralGenome" — um JSON descrevendo a forma visual única de um mascote 2D.

REGRAS DURAS:
- Retorne APENAS um objeto JSON válido, sem comentário ou texto fora.
- "version": 1 sempre.
- "generatedAt": ISO 8601 atual.
- "trigger": exatamente o trigger que recebeu no contexto.
- "palette" tem body/accent/deep/eye — cada um tuple [hue 0-360, sat 0-100, lit 0-100].
- "silhouette.headShape" ∈ ["round","oval","square","teardrop","crystal","cloud"].
- "silhouette.bodyShape" ∈ ["pebble","capsule","orb","leaf","stone"].
- "silhouette.headRx" e "headRy" ∈ [20, 70].
- "silhouette.proportions.headBody" e "eyeSize" ∈ [0.5, 2.0].
- "marks" array, máx 5. Cada mark: {kind, placement, color, seed}.
  - kind ∈ ["spot","stripe","scar","star","crescent","leaf","rune"]
  - placement ∈ ["cheek","forehead","body","tail"]
  - color ∈ ["accent","deep","gold"]
  - seed número inteiro positivo
- "accessories" array (pode ser vazio). Sem "customSvg" — só {id, origin}.
- "expression": {mouthCurve: [-1..1], eyeTilt: [-20..20], cheekAlways: boolean}.
- "story": 1-2 frases (máx 280 chars) em português brasileiro, narrativa emocional sobre a forma que o mascote ganhou.

NUNCA invente campos extras. NUNCA inclua scripts ou HTML no story.`;

function buildUserPrompt(input: GenerateInput): string {
  const actions = (input.recentActions ?? []).slice(0, 6).join(', ') || '(nenhuma)';
  const themes = (input.recentChatThemes ?? []).slice(0, 5).join(', ') || '(nenhum)';
  return `Personalidade base: ${input.personality}
Nome do mascote: ${input.mascotName ?? 'sem nome'}
Trigger atual: ${input.trigger}
Fase: ${input.phase ?? 'desconhecida'}
Streak (dias seguidos): ${input.streak ?? 0}
Hábitos recentes do usuário: ${actions}
Temas recentes de conversa: ${themes}

Gere o ProceduralGenome que reflete essa jornada. O número de marks deve crescer com streak (0-5).`;
}

export async function generateViaOpenAIDirect(input: GenerateInput): Promise<ProceduralGenome | null> {
  const key = getOpenAIKey();
  if (!key) return null;
  if (isProductionEnv()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.85,
        // Cap defensivo: o ProceduralGenome JSON real cabe em ~1200 tokens.
        // Sem max_tokens, modelo descalibrado/jailbreak pode gerar reply
        // gigante — sangrando custo (~$0.60/M out) sem ganho funcional.
        // Validator descartaria depois, mas o custo já foi pago.
        max_tokens: 1500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(input) },
        ],
      }),
    });
    if (!res.ok) {
      logger.warn('[procedural-openai] HTTP error', { status: res.status });
      return null;
    }
    const json = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      logger.warn('[procedural-openai] JSON parse falhou', { err: String(err) });
      return null;
    }
    // O LLM costuma esquecer/atrasar generatedAt — patcheamos antes de validar
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.generatedAt !== 'string') obj.generatedAt = new Date().toISOString();
      if (obj.trigger !== input.trigger) obj.trigger = input.trigger;
      if (obj.version !== 1) obj.version = 1;
    }
    return validateProceduralGenome(parsed);
  } catch (err) {
    logger.warn('[procedural-openai] falhou', { err: String(err) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
