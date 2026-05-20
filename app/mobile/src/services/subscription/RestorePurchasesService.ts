/**
 * Restauração de compras — fluxo dedicado com mensagens honestas.
 */

import type { BillingTierId } from '@/content/billing';
import { logger } from '@/lib/logger';
import { trackSubscriptionRestored } from '@/analytics/trackSubscription';
import { getBillingProvider, isDemoBilling } from './billing-provider';
import { mapPurchaseError } from './PurchaseErrorMapper';
import { localSubscriptionRepo } from '@/repositories/local';
import { getRevenueCatConfig } from './RevenueCatBillingProvider';

export interface RestoreResult {
  success: boolean;
  tier: BillingTierId;
  message: string;
  demo: boolean;
}

export class RestorePurchasesService {
  async restore(userId: string): Promise<RestoreResult> {
    const demo = isDemoBilling();
    const billing = getBillingProvider();
    const previous = await localSubscriptionRepo.getTier(userId);

    if (demo) {
      const tier = await billing.restore(userId);
      const success = tier !== 'free';
      trackSubscriptionRestored(tier, success);
      return {
        success,
        tier,
        demo: true,
        message: success
          ? 'Modo demo: Plus restaurado localmente (sem cobrança real).'
          : 'Modo demo: nenhuma assinatura salva neste dispositivo.',
      };
    }

    const rc = getRevenueCatConfig();
    if (!rc.hasApiKey || !rc.sdkEnabled) {
      const err = mapPurchaseError('billing_unavailable');
      return { success: false, tier: previous, demo: false, message: err.userMessage };
    }

    try {
      const tier = await billing.restore(userId);
      if (tier !== 'free') {
        await localSubscriptionRepo.setTier(userId, tier);
        trackSubscriptionRestored(tier, true);
        return {
          success: true,
          tier,
          demo: false,
          message: 'Plus restaurado com sucesso!',
        };
      }
      trackSubscriptionRestored(previous, false);
      return {
        success: false,
        tier: previous,
        demo: false,
        message: 'Nenhuma assinatura ativa encontrada nesta conta da loja.',
      };
    } catch (e) {
      const safe = e instanceof Error ? e.message : 'unknown';
      logger.warn('[billing] restore failed', { reason: safe });
      const mapped = mapPurchaseError(safe);
      trackSubscriptionRestored(previous, false);
      return { success: false, tier: previous, demo: false, message: mapped.userMessage };
    }
  }
}

export const restorePurchasesService = new RestorePurchasesService();
