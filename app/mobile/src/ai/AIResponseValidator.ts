/**
 * Valida respostas de IA (proxy/OpenAI) antes de exibir ao usuário.
 */

import type { SafetyFlag } from '@/types';
import { classifyInput, classifyOutput, CRISIS_REPLY, SAFE_FALLBACK } from '@/content/safety';
import type { AiResponse } from '@/lib/ai';

const MAX_WORDS = 35;
const MAX_CHARS = 280;
// Hard ceilings — acima disso truncamos por força (gera ellipsis), pois indica
// modelo descalibrado ou prompt-injection. Soft ceilings só viram warning.
const HARD_MAX_CHARS = 600;
const HARD_MAX_WORDS = 80;

export interface ValidationResult {
  /** Conteúdo passou checks de SEGURANÇA (safety/markup). NÃO o mesmo que sem warnings. */
  valid: boolean;
  /**
   * Se true, validation passou totalmente — sem warnings de tamanho.
   * Distingue "OpenAI deu resposta longa mas segura" (valid=true, clean=false)
   * de "OpenAI deu resposta canônica do tamanho certo" (valid=true, clean=true).
   * Caller deve manter source='openai' quando valid=true mesmo se clean=false —
   * só rebaixa pra 'fallback' quando valid=false (rejeição de segurança).
   */
  clean: boolean;
  reply: string;
  safety_flag: SafetyFlag;
  issues: string[];
}

function truncateAtWordBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars - 1);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice) + '…';
}

export function validateAiResponse(
  raw: { reply?: string; safety_flag?: SafetyFlag },
  inputFlag: SafetyFlag = 'safe',
): ValidationResult {
  const issues: string[] = [];
  let reply = (raw.reply ?? '').trim();

  if (!reply) {
    return {
      valid: false,
      clean: false,
      reply: SAFE_FALLBACK,
      safety_flag: 'watch',
      issues: ['empty_reply'],
    };
  }

  // Defense-in-depth: if the upstream model emitted crisis-style content
  // (e.g., echoed back self-harm phrasing), surface CRISIS_REPLY — never let
  // the original payload reach the user. classifyInput's critical/high
  // patterns are appropriate here because content semantics are the same
  // whether the text came from user or assistant.
  const inputSideFlag = classifyInput(reply);
  if (inputSideFlag === 'critical' || inputSideFlag === 'high') {
    return {
      valid: false,
      clean: false,
      reply: CRISIS_REPLY,
      safety_flag: 'critical',
      issues: ['safety_output_crisis'],
    };
  }

  const outputFlag = classifyOutput(reply);
  if (outputFlag !== 'safe') {
    return {
      valid: false,
      clean: false,
      reply: SAFE_FALLBACK,
      safety_flag: outputFlag,
      issues: ['safety_output'],
    };
  }

  if (/```|<script|https?:\/\//i.test(reply)) {
    return {
      valid: false,
      clean: false,
      reply: SAFE_FALLBACK,
      safety_flag: 'watch',
      issues: ['forbidden_markup'],
    };
  }

  // Length: SOFT ceilings só viram warning (clean=false), reply continua
  // como OpenAI real. HARD ceiling força truncate gracioso — modelo
  // descalibrado entregando 1000+ chars não vira SAFE_FALLBACK silencioso
  // (esse era o bug auditoria 2026-05-27: respostas longas viravam
  // SAFE_FALLBACK canned, batendo exatamente na queixa "chat scriptado").
  if (reply.length > HARD_MAX_CHARS || reply.split(/\s+/).filter(Boolean).length > HARD_MAX_WORDS) {
    reply = truncateAtWordBoundary(reply, HARD_MAX_CHARS);
    issues.push('hard_truncated');
  }
  if (reply.length > MAX_CHARS) issues.push('soft_too_long_chars');
  if (reply.split(/\s+/).filter(Boolean).length > MAX_WORDS) issues.push('soft_too_many_words');

  // Nunca confiar em safety_flag entregue pelo proxy/OpenAI — recomputa
  // localmente. moreSevere(inputFlag, outputFlag-on-input-side) garante
  // que o flag exportado é, no mínimo, tão severo quanto o do input.
  const finalFlag: SafetyFlag = severer(inputFlag, inputSideFlag);

  return {
    valid: true,
    clean: issues.length === 0,
    reply,
    safety_flag: finalFlag,
    issues,
  };
}

const ORDER: Record<SafetyFlag, number> = { safe: 0, watch: 1, high: 2, critical: 3 };
function severer(a: SafetyFlag, b: SafetyFlag): SafetyFlag {
  return ORDER[a] >= ORDER[b] ? a : b;
}

export function toAiResponse(
  raw: { reply?: string; safety_flag?: SafetyFlag },
  source: AiResponse['source'],
  inputFlag: SafetyFlag = 'safe',
): AiResponse {
  const v = validateAiResponse(raw, inputFlag);
  // Source preservado quando valid=true mesmo com warnings de tamanho.
  // Antes a UI rebaixava pra 'fallback' em qualquer issue → badge "modo local"
  // aparecia em respostas reais da nuvem (auditoria 2026-05-27).
  return {
    reply: v.reply,
    safety_flag: v.safety_flag,
    source: v.valid ? source : 'fallback',
  };
}
