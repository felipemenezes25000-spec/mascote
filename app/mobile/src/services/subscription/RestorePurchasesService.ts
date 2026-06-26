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
    // Gate em `ready` (não só hasApiKey/sdkEnabled): no estado `sdk_not_linked`
    // (chaves + RC_ENABLED ok mas SDK nativo não integrado no build) ambos eram
    // true, então o código seguia, billing.restore() devolvia o tier LOCAL
    // inalterado (provider gateia em config.ready), e um usuário já em plus_*
    // recebia "Plus restaurado com sucesso!" sem nenhuma chamada real à loja —
    // falso-sucesso. `!rc.ready` cobre todos os estados não-prontos, simétrico a
    // provider.purchase()/restore() que já usam config.ready.
    if (!rc.ready) {
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
      // RC disse 'free' mas o local estava em premium — usuário cancelou
      // pela loja e o app ficou com cache desatualizado. Reconcilia para
      // não permitir uso premium indevido.
      if (previous !== 'free') {
        await localSubscriptionRepo.setTier(userId, 'free');
      }
      trackSubscriptionRestored('free', false);
      return {
        success: false,
        tier: 'free',
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
