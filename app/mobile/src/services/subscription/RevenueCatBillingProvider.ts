/**
 * Adapter RevenueCat — mesma interface do mock; sem API keys no repo.
 * Ative com EXPO_PUBLIC_BILLING_PROVIDER=revenuecat + chaves + RC_ENABLED=true.
 */

import type { BillingTierId } from '@/content/billing';
import { localSubscriptionRepo } from '@/repositories/local';
import type { PurchaseResult } from './MockBillingProvider';
import {
  initRevenueCatSdk,
  isRevenueCatSdkInitialized,
  purchaseRevenueCatTier,
  restoreRevenueCatPurchases,
  __resetRevenueCatSdkForTests,
  __setRevenueCatSdkInitializedForTests,
} from './revenueCatSdk';

export {
  initRevenueCatSdk,
  isRevenueCatSdkInitialized,
  __resetRevenueCatSdkForTests,
  __setRevenueCatSdkInitializedForTests,
};

export type RevenueCatReadiness =
  | 'not_selected'
  | 'missing_api_key'
  | 'sdk_disabled'
  | 'sdk_not_linked'
  | 'ready';

export interface RevenueCatConfig {
  providerKind: string | undefined;
  hasApiKey: boolean;
  sdkEnabled: boolean;
  ready: boolean;
  readiness: RevenueCatReadiness;
}

export function getRevenueCatConfig(): RevenueCatConfig {
  const providerKind = process.env.EXPO_PUBLIC_BILLING_PROVIDER;
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS?.trim();
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID?.trim();
  const genericKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();
  const hasApiKey = Boolean(iosKey || androidKey || genericKey);
  const sdkEnabled = process.env.EXPO_PUBLIC_RC_ENABLED === 'true';
  let readiness: RevenueCatReadiness = 'not_selected';
  if (providerKind === 'revenuecat') {
    if (!hasApiKey) readiness = 'missing_api_key';
    else if (!sdkEnabled) readiness = 'sdk_disabled';
    else if (isRevenueCatSdkInitialized()) readiness = 'ready';
    else readiness = 'sdk_not_linked';
  }
  const ready = readiness === 'ready';
  return { providerKind, hasApiKey, sdkEnabled, ready, readiness };
}

export function revenueCatUnavailableMessage(config = getRevenueCatConfig()): string {
  switch (config.readiness) {
    case 'not_selected':
      return 'Provedor RevenueCat não selecionado.';
    case 'missing_api_key':
      return 'RevenueCat sem API key — configure EXPO_PUBLIC_REVENUECAT_API_KEY no .env.';
    case 'sdk_disabled':
      return 'RevenueCat desativado — defina EXPO_PUBLIC_RC_ENABLED=true após integrar o SDK.';
    case 'sdk_not_linked':
      return 'RevenueCat ainda não integrado ao SDK nativo neste build.';
    case 'ready':
      return 'RevenueCat pronto para compras nativas.';
    default:
      return 'Billing indisponível.';
  }
}

/** Estado honesto para UI — nunca simula compra bem-sucedida em produção. */
export function getRevenueCatUiState(config = getRevenueCatConfig()) {
  return {
    isDemo: config.providerKind !== 'revenuecat',
    isProductionTarget: config.providerKind === 'revenuecat',
    canAttemptPurchase: config.ready,
    readiness: config.readiness,
    message: revenueCatUnavailableMessage(config),
  };
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

    const result = await purchaseRevenueCatTier(tier);
    if (result.success) {
      await localSubscriptionRepo.setTier(userId, result.tier);
    }
    return {
      success: result.success,
      tier: result.success ? result.tier : current,
      error: result.error,
    };
  }

  async restore(userId: string): Promise<BillingTierId> {
    const config = getRevenueCatConfig();
    if (!config.ready) {
      return localSubscriptionRepo.getTier(userId);
    }
    const tier = await restoreRevenueCatPurchases();
    if (tier !== 'free') {
      await localSubscriptionRepo.setTier(userId, tier);
    }
    return tier;
  }

  async cancel(userId: string): Promise<void> {
    await localSubscriptionRepo.setTier(userId, 'free');
  }
}

export const revenueCatBillingProvider = new RevenueCatBillingProvider();
