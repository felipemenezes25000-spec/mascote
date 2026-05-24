/**
 * Valida respostas de IA (proxy/OpenAI) antes de exibir ao usuário.
 */

import type { SafetyFlag } from '@/types';
import { classifyInput, classifyOutput, CRISIS_REPLY, SAFE_FALLBACK } from '@/content/safety';
import type { AiResponse } from '@/lib/ai';

const MAX_WORDS = 35;
const MAX_CHARS = 280;

export interface ValidationResult {
  valid: boolean;
  reply: string;
  safety_flag: SafetyFlag;
  issues: string[];
}

export function validateAiResponse(
  raw: { reply?: string; safety_flag?: SafetyFlag },
  inputFlag: SafetyFlag = 'safe',
): ValidationResult {
  const issues: string[] = [];
  const reply = (raw.reply ?? '').trim();

  if (!reply) {
    return {
      valid: false,
      reply: SAFE_FALLBACK,
      safety_flag: 'watch',
      issues: ['empty_reply'],
    };
  }

  if (reply.length > MAX_CHARS) issues.push('too_long_chars');
  const words = reply.split(/\s+/).filter(Boolean);
  if (words.length > MAX_WORDS) issues.push('too_many_words');

  // Defense-in-depth: if the upstream model emitted crisis-style content
  // (e.g., echoed back self-harm phrasing), surface CRISIS_REPLY — never let
  // the original payload reach the user. classifyInput's critical/high
  // patterns are appropriate here because content semantics are the same
  // whether the text came from user or assistant.
  const inputSideFlag = classifyInput(reply);
  if (inputSideFlag === 'critical' || inputSideFlag === 'high') {
    return {
      valid: false,
      reply: CRISIS_REPLY,
      safety_flag: 'critical',
      issues: [...issues, 'safety_output_crisis'],
    };
  }

  const outputFlag = classifyOutput(reply);
  if (outputFlag !== 'safe') {
    return {
      valid: false,
      reply: SAFE_FALLBACK,
      safety_flag: outputFlag,
      issues: [...issues, 'safety_output'],
    };
  }

  if (/```|<script|https?:\/\//i.test(reply)) {
    return {
      valid: false,
      reply: SAFE_FALLBACK,
      safety_flag: 'watch',
      issues: [...issues, 'forbidden_markup'],
    };
  }

  // Nunca confiar em safety_flag entregue pelo proxy/OpenAI — recomputa
  // localmente. moreSevere(inputFlag, outputFlag-on-input-side) garante
  // que o flag exportado é, no mínimo, tão severo quanto o do input.
  const finalFlag: SafetyFlag = severer(inputFlag, inputSideFlag);

  return {
    valid: issues.length === 0,
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
  return {
    reply: v.reply,
    safety_flag: v.safety_flag,
    source: v.valid ? source : 'fallback',
  };
}
