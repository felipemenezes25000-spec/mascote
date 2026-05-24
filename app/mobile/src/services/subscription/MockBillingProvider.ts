/**
 * Mock billing provider — demo local até RevenueCat/StoreKit.
 */

import type { BillingTierId } from '@/content/billing';
import { localSubscriptionRepo } from '@/repositories/local';

export interface PurchaseResult {
  success: boolean;
  tier: BillingTierId;
  error?: string;
}

export class MockBillingProvider {
  async purchase(userId: string, tier: BillingTierId): Promise<PurchaseResult> {
    if (!__DEV__ && process.env.NODE_ENV === 'production') {
      return {
        success: false,
        tier: await localSubscriptionRepo.getTier(userId),
        error: 'MockBillingProvider bloqueado em build de produção.',
      };
    }
    if (tier === 'free') {
      await localSubscriptionRepo.setTier(userId, 'free');
      return { success: true, tier: 'free' };
    }
    await localSubscriptionRepo.setTier(userId, tier);
    return { success: true, tier };
  }

  async restore(userId: string): Promise<BillingTierId> {
    if (!__DEV__ && process.env.NODE_ENV === 'production') {
      return localSubscriptionRepo.getTier(userId);
    }
    return localSubscriptionRepo.getTier(userId);
  }

  async cancel(userId: string): Promise<void> {
    if (!__DEV__ && process.env.NODE_ENV === 'production') return;
    await localSubscriptionRepo.setTier(userId, 'free');
  }
}

export const mockBillingProvider = new MockBillingProvider();
