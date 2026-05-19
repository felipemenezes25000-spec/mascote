/**
 * Serviço de assinatura — tier, trial, benefícios.
 */

import type { BillingTierId } from '@/content/billing';
import { getTier } from '@/content/billing';
import { localSubscriptionRepo } from '@/repositories/local';
import { getBillingProvider } from './billing-provider';

export class SubscriptionService {
  private billing = getBillingProvider();

  async getCurrentTier(userId: string): Promise<BillingTierId> {
    return localSubscriptionRepo.getTier(userId);
  }

  async subscribe(userId: string, tier: BillingTierId) {
    return this.billing.purchase(userId, tier);
  }

  async cancel(userId: string) {
    await this.billing.cancel(userId);
  }

  async restore(userId: string) {
    const tier = await this.billing.restore(userId);
    if (tier !== 'free') await localSubscriptionRepo.setTier(userId, tier);
    return tier;
  }

  getBenefits(tierId: BillingTierId) {
    return getTier(tierId).benefits;
  }

  isPremium(tierId: BillingTierId): boolean {
    return tierId !== 'free';
  }
}

export const subscriptionService = new SubscriptionService();
