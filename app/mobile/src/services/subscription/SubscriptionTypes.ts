/**
 * Tipos centralizados de assinatura — produtos, entitlements, erros.
 */

import type { BillingTierId } from '@/content/billing';

/** Entitlements lógicos (RevenueCat / StoreKit). */
export type EntitlementId = 'premium' | 'legendary' | 'ai_plus';

/** Produtos de loja — mapear SKUs no dashboard RevenueCat. */
export type ProductId = 'mascote_plus_monthly' | 'mascote_plus_annual' | 'mascote_trial';

export interface SubscriptionState {
  tier: BillingTierId;
  entitlements: readonly EntitlementId[];
  trialActive: boolean;
  expiresAt?: string;
  updatedAt: string;
}

export interface PurchaseError {
  code: string;
  message: string;
  userMessage: string;
  recoverable: boolean;
}

export const TIER_TO_ENTITLEMENTS: Record<BillingTierId, readonly EntitlementId[]> = {
  free: [],
  plus_monthly: ['premium', 'ai_plus'],
  plus_annual: ['premium', 'legendary', 'ai_plus'],
};

export function entitlementsForTier(tier: BillingTierId): readonly EntitlementId[] {
  return TIER_TO_ENTITLEMENTS[tier] ?? [];
}

export function hasEntitlement(tier: BillingTierId, id: EntitlementId): boolean {
  return entitlementsForTier(tier).includes(id);
}
