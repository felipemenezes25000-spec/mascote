/**
 * Regressão: purchaseRevenueCatTier deve FALHAR (fail-closed) quando o pacote
 * exato pedido não existe, em vez de cobrar `availablePackages[0]` em silêncio.
 *
 * Antes do fix, "pede anual → não acha → compra o primeiro (mensal)". Em fluxo
 * de dinheiro, recusar é mais seguro do que cobrar o produto errado.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Purchases from 'react-native-purchases';
import {
  purchaseRevenueCatTier,
  __setRevenueCatSdkInitializedForTests,
  __resetRevenueCatSdkForTests,
} from '@/services/subscription/revenueCatSdk';

describe('purchaseRevenueCatTier — fail-closed em SKU não encontrado', () => {
  beforeEach(() => {
    __setRevenueCatSdkInitializedForTests(true);
  });

  afterEach(() => {
    __resetRevenueCatSdkForTests();
    vi.restoreAllMocks();
  });

  it('recusa a compra quando o pacote pedido não existe (não cobra outro)', async () => {
    // Offering só tem mensal; usuário pede anual.
    vi.mocked(Purchases.getOfferings).mockResolvedValueOnce({
      current: {
        availablePackages: [{ identifier: 'plus_monthly' }],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const purchaseSpy = vi.mocked(Purchases.purchasePackage);

    const result = await purchaseRevenueCatTier('plus_annual');

    expect(result.success).toBe(false);
    expect(result.tier).toBe('free');
    expect(result.error).toContain('plus_annual');
    // O ponto central: NUNCA tentou comprar o pacote errado.
    expect(purchaseSpy).not.toHaveBeenCalled();
  });

  it('compra o pacote exato quando o identifier bate', async () => {
    vi.mocked(Purchases.getOfferings).mockResolvedValueOnce({
      current: {
        availablePackages: [
          { identifier: 'plus_monthly' },
          { identifier: 'plus_annual' },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(Purchases.purchasePackage).mockResolvedValueOnce({
      customerInfo: { entitlements: { active: { plus_annual: { isActive: true } } } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await purchaseRevenueCatTier('plus_annual');

    expect(result.success).toBe(true);
    expect(result.tier).toBe('plus_annual');
    expect(Purchases.purchasePackage).toHaveBeenCalledWith({ identifier: 'plus_annual' });
  });
});
