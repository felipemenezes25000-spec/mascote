/**
 * Adapter RevenueCat — mesma interface do mock; sem API keys no repo.
 * Ative com EXPO_PUBLIC_BILLING_PROVIDER=revenuecat + chaves + RC_ENABLED=true.
 */

import type { BillingTierId } from '@/content/billing';
import { localSubscriptionRepo } from '@/repositories/local';
import type { PurchaseResult } from './MockBillingProvider';

export interface RevenueCatConfig {
  providerKind: string | undefined;
  hasApiKey: boolean;
  sdkEnabled: boolean;
  ready: boolean;
}

export function getRevenueCatConfig(): RevenueCatConfig {
  const providerKind = process.env.EXPO_PUBLIC_BILLING_PROVIDER;
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS?.trim();
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID?.trim();
  const genericKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();
  const hasApiKey = Boolean(iosKey || androidKey || genericKey);
  const sdkEnabled = process.env.EXPO_PUBLIC_RC_ENABLED === 'true';
  const ready = providerKind === 'revenuecat' && hasApiKey && sdkEnabled;
  return { providerKind, hasApiKey, sdkEnabled, ready };
}

export function revenueCatUnavailableMessage(config = getRevenueCatConfig()): string {
  if (config.providerKind !== 'revenuecat') {
    return 'Provedor RevenueCat não selecionado.';
  }
  if (!config.hasApiKey) {
    return 'RevenueCat sem API key — configure EXPO_PUBLIC_REVENUECAT_API_KEY no .env.';
  }
  if (!config.sdkEnabled) {
    return 'RevenueCat desativado — defina EXPO_PUBLIC_RC_ENABLED=true após integrar o SDK.';
  }
  return 'RevenueCat ainda não integrado ao SDK nativo neste build.';
}

export class RevenueCatBillingProvider {
  async purchase(userId: string, tier: BillingTierId): Promise<PurchaseResult> {
    const current = await localSubscriptionRepo.getTier(userId);

    if (tier === 'free') {
      await localSubscriptionRepo.setTier(userId, 'free');
      return { success: true, tier: 'free' };
    }

    const config = getRevenueCatConfig();
    if (!config.ready) {
      return {
        success: false,
        tier: current,
        error: revenueCatUnavailableMessage(config),
      };
    }

    // Ponto de extensão: Purchases.purchasePackage(...) quando react-native-purchases estiver no app.
    return {
      success: false,
      tier: current,
      error: 'SDK RevenueCat não vinculado neste build — use mock em desenvolvimento.',
    };
  }

  async restore(userId: string): Promise<BillingTierId> {
    const config = getRevenueCatConfig();
    if (!config.ready) {
      return localSubscriptionRepo.getTier(userId);
    }
    // Ponto de extensão: Purchases.restorePurchases()
    return localSubscriptionRepo.getTier(userId);
  }

  async cancel(userId: string): Promise<void> {
    await localSubscriptionRepo.setTier(userId, 'free');
  }
}

export const revenueCatBillingProvider = new RevenueCatBillingProvider();
