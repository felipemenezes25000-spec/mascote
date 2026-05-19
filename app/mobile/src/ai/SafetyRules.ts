/**
 * Regras de segurança para IA do mascote.
 */

import { classifyInput, CRISIS_REPLY, DIAGNOSIS_REDIRECT } from '@/content/safety';
import type { SafetyFlag } from '@/types';

export interface SafetyDecision {
  allowed: boolean;
  flag: SafetyFlag;
  redirect?: string;
}

export function evaluateUserMessage(message: string): SafetyDecision {
  const flag = classifyInput(message);
  if (flag === 'critical') {
    return { allowed: false, flag, redirect: CRISIS_REPLY };
  }
  if (flag === 'high') {
    return { allowed: false, flag, redirect: CRISIS_REPLY };
  }
  if (/tenho (depress|ansiedade|tdah|bipolar)/i.test(message)) {
    return { allowed: false, flag: 'watch', redirect: DIAGNOSIS_REDIRECT };
  }
  return { allowed: true, flag };
}

export function sanitizeMascotOutput(text: string): string {
  return text.replace(/\b(diagnóstico|prescrev|medicament)\b/gi, '[redacted]');
}
