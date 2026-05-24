/**
 * Rate limit de IA por tier — impede abuso e alinha com planos.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BillingTierId } from '@/content/billing';
import { todayLocal, withLock } from '@/lib/db';
import { entitlementService } from '@/services/subscription/EntitlementService';

const KEY = (userId: string) => `mascote:ai_usage:${userId}:${todayKey()}`;

function todayKey(): string {
  return todayLocal();
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number | null;
  limit: number | null;
  reason?: string;
}

export async function checkAiRateLimit(
  userId: string,
  tier: BillingTierId,
): Promise<RateLimitResult> {
  const limit = entitlementService.dailyChatLimit(tier);
  if (limit === null) {
    return { allowed: true, remaining: null, limit: null };
  }

  const raw = await AsyncStorage.getItem(KEY(userId));
  const used = raw ? Number.parseInt(raw, 10) || 0 : 0;
  const remaining = Math.max(0, limit - used);

  if (used >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      reason: `Limite diário de ${limit} mensagens atingido. Plus libera chat ilimitado.`,
    };
  }
  return { allowed: true, remaining, limit };
}

export async function recordAiUsage(userId: string): Promise<void> {
  // Sem lock, taps paralelos perdem incremento (vide AICostGuard.recordAiCost).
  await withLock(`ai_usage:${userId}`, async () => {
    const key = KEY(userId);
    const raw = await AsyncStorage.getItem(key);
    const used = raw ? Number.parseInt(raw, 10) || 0 : 0;
    await AsyncStorage.setItem(key, String(used + 1));
  });
}

/** Test helper — zera contador do dia. */
export async function resetAiUsage(userId: string): Promise<void> {
  await AsyncStorage.removeItem(KEY(userId));
}
