/**
 * Guarda de custo estimado — budget diário de tokens (local-first).
 * Produção: proxy backend aplica limites reais; isto é camada cliente.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BillingTierId } from '@/content/billing';
import { todayLocal } from '@/lib/db';

const BUDGET_KEY = (userId: string) => `mascote:ai_cost:${userId}:${todayKey()}`;

function todayKey(): string {
  return todayLocal();
}

/** Tokens estimados por resposta (gpt-4o-mini ~ prompt+completion). */
export const ESTIMATED_TOKENS_PER_REPLY = 180;

// Plus = "ilimitado prático". Antes era 50k = ~277 msgs/dia, o que descumpria
// a promessa "Chat IA ilimitado" para um user power. 500k = ~2700 msgs/dia,
// muito acima de qualquer uso humano legítimo, mantendo o safety net contra
// abuso/runaway de custo (produção: backend proxy aplica limite real).
// Free segue conservador pra preservar margem do trial.
const DAILY_TOKEN_BUDGET: Record<BillingTierId, number> = {
  free: 2_000,
  plus_monthly: 500_000,
  plus_annual: 500_000,
};

export interface CostGuardResult {
  allowed: boolean;
  usedTokens: number;
  budget: number;
  reason?: string;
}

export async function checkAiCostBudget(
  userId: string,
  tier: BillingTierId,
  estimatedTokens = ESTIMATED_TOKENS_PER_REPLY,
): Promise<CostGuardResult> {
  const budget = DAILY_TOKEN_BUDGET[tier] ?? DAILY_TOKEN_BUDGET.free;
  const raw = await AsyncStorage.getItem(BUDGET_KEY(userId));
  const usedTokens = raw ? Number.parseInt(raw, 10) || 0 : 0;

  if (usedTokens + estimatedTokens > budget) {
    return {
      allowed: false,
      usedTokens,
      budget,
      reason: 'Orçamento diário de IA atingido. Amanhã renova — ou assine Plus.',
    };
  }
  return { allowed: true, usedTokens, budget };
}

export async function recordAiCost(
  userId: string,
  tokens = ESTIMATED_TOKENS_PER_REPLY,
): Promise<void> {
  const key = BUDGET_KEY(userId);
  const raw = await AsyncStorage.getItem(key);
  const used = raw ? Number.parseInt(raw, 10) || 0 : 0;
  await AsyncStorage.setItem(key, String(used + tokens));
}

export async function resetAiCost(userId: string): Promise<void> {
  await AsyncStorage.removeItem(BUDGET_KEY(userId));
}
