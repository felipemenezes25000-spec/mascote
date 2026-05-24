/**
 * Regras de segurança para IA do mascote.
 */

import { classifyInput, CRISIS_REPLY, DIAGNOSIS_REDIRECT } from '@/content/safety';
import { classifySafetyEnsemble, moreSevere } from '@/lib/ml/safety/classifier';
import type { SafetyFlag } from '@/types';

export interface SafetyDecision {
  allowed: boolean;
  flag: SafetyFlag;
  redirect?: string;
}

export function evaluateUserMessage(message: string): SafetyDecision {
  // Ensemble (regex + Bayes + sentiment) + regex fundida com moreSevere para
  // garantir que rate-limit/cost-budget no MascotAI nunca eclipse uma crise
  // que só o ensemble detectaria (e.g., sentiment muito negativo sem keyword).
  let flag: SafetyFlag;
  try {
    const ensemble = classifySafetyEnsemble(message);
    flag = moreSevere(ensemble.flag, classifyInput(message));
  } catch {
    flag = classifyInput(message);
  }
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
