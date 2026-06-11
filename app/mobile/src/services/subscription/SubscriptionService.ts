/**
 * Serviço de assinatura — tier, trial, benefícios.
 */

import type { BillingTierId } from '@/content/billing';
import { getTier } from '@/content/billing';
import { localSubscriptionRepo } from '@/repositories/local';
import { trackSubscriptionCancelled } from '@/analytics/trackSubscription';
import { withLock } from '@/lib/db';
import { getBillingProvider } from './billing-provider';
import { restorePurchasesService } from './RestorePurchasesService';

export class SubscriptionService {
  async getCurrentTier(userId: string): Promise<BillingTierId> {
    return localSubscriptionRepo.getTier(userId);
  }

  async subscribe(userId: string, tier: BillingTierId) {
    // withLock evita double-purchase quando o user toca em paywall em dois
    // pontos do app ao mesmo tempo (deep-link + tab). Também resolve env
    // change durante reload: getBillingProvider() é chamado a cada call.
    return withLock(`subscribe:${userId}`, () =>
      getBillingProvider().purchase(userId, tier),
    );
  }

  async cancel(userId: string) {
    return withLock(`subscribe:${userId}`, async () => {
      const previous = await localSubscriptionRepo.getTier(userId);
      await getBillingProvider().cancel(userId);
      trackSubscriptionCancelled(previous);
    });
  }

  async restore(userId: string) {
    const result = await restorePurchasesService.restore(userId);
    return result.tier;
  }

  /**
   * Sincroniza o tier local com o entitlement real da loja (RevenueCat). Chamado
   * no launch — pega cancelamento/expiração feitos pela loja que de outra forma
   * nunca chegariam ao app. No mock é no-op. Serializa com purchase/cancel via lock.
   */
  async syncEntitlements(userId: string) {
    return withLock(`subscribe:${userId}`, () =>
      getBillingProvider().syncEntitlements(userId),
    );
  }

  getBenefits(tierId: BillingTierId) {
    return getTier(tierId).benefits;
  }

  isPremium(tierId: BillingTierId): boolean {
    return tierId !== 'free';
  }
}

export const subscriptionService = new SubscriptionService();
