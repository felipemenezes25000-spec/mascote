/**
 * Valida respostas de IA (proxy/OpenAI) antes de exibir ao usuário.
 */

import type { SafetyFlag } from '@/types';
import { classifyOutput } from '@/content/safety';
import { SAFE_FALLBACK } from '@/content/safety';
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

  return {
    valid: issues.length === 0,
    reply,
    safety_flag: raw.safety_flag ?? inputFlag,
    issues,
  };
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
