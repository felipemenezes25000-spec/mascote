/**
 * Instrumentação de assinatura — Pilar 5 (cancelar sem perder DNA).
 */

import { analytics } from './AnalyticsService';
import type { BillingTierId } from '@/content/billing';
import { isDemoBilling } from '@/services/subscription/billing-provider';

export function trackSubscriptionCancelled(previousTier: BillingTierId): void {
  analytics.track('subscription_cancelled', {
    tier: previousTier,
    via: isDemoBilling() ? 'demo' : 'store',
  });
}

export function trackSubscriptionRestored(tier: BillingTierId, success: boolean): void {
  analytics.track('subscription_restored', { tier, success });
}
