/**
 * Serviço de assinatura — tier, trial, benefícios.
 */

import type { BillingTierId } from '@/content/billing';
import { getTier } from '@/content/billing';
import { localSubscriptionRepo } from '@/repositories/local';
import { trackSubscriptionCancelled } from '@/analytics/trackSubscription';
import { getBillingProvider } from './billing-provider';
import { restorePurchasesService } from './RestorePurchasesService';

export class SubscriptionService {
  private billing = getBillingProvider();

  async getCurrentTier(userId: string): Promise<BillingTierId> {
    return localSubscriptionRepo.getTier(userId);
  }

  async subscribe(userId: string, tier: BillingTierId) {
    return this.billing.purchase(userId, tier);
  }

  async cancel(userId: string) {
    const previous = await localSubscriptionRepo.getTier(userId);
    await this.billing.cancel(userId);
    trackSubscriptionCancelled(previous);
  }

  async restore(userId: string) {
    const result = await restorePurchasesService.restore(userId);
    return result.tier;
  }

  getBenefits(tierId: BillingTierId) {
    return getTier(tierId).benefits;
  }

  isPremium(tierId: BillingTierId): boolean {
    return tierId !== 'free';
  }
}

export const subscriptionService = new SubscriptionService();
