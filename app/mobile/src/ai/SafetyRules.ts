/**
 * Regras de segurança para IA do mascote.
 */

import {
  ATTACHMENT_REPLY,
  classifyInput,
  CRISIS_REPLY,
  detectAttachment,
  DIAGNOSIS_REDIRECT,
} from '@/content/safety';
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
    // Invariante (audit mai/2026): high é tratado como critical — flag exportada
    // tem que ser 'critical' pra UI/analytics aplicarem disclaimers corretos.
    // lib/ai.ts já fazia isso; aqui estava regredido. Travado por
    // tests/ai/mascot-ai.test.ts ('trata input high ... como critical').
    return { allowed: false, flag: 'critical', redirect: CRISIS_REPLY };
  }
  if (/tenho (depress|ansiedade|tdah|bipolar)/i.test(message)) {
    return { allowed: false, flag: 'watch', redirect: DIAGNOSIS_REDIRECT };
  }
  // Attachment (user trata a IA como vínculo humano substituto) — o pipeline
  // canônico (lib/ai.ts generateReplyInternal) já devolvia ATTACHMENT_REPLY,
  // mas o fallback (chat-engine/MascotAI via evaluateUserMessage) não checava,
  // então "você é minha única amiga"/"te amo" ia pra OpenAI/mock sem o nudge de
  // autocuidado. Paridade com lib/ai.ts: flag 'watch', redirect ATTACHMENT_REPLY.
  if (detectAttachment(message)) {
    return { allowed: false, flag: 'watch', redirect: ATTACHMENT_REPLY };
  }
  return { allowed: true, flag };
}

export function sanitizeMascotOutput(text: string): string {
  return text.replace(/\b(diagnóstico|prescrev|medicament)\b/gi, '[redacted]');
}
