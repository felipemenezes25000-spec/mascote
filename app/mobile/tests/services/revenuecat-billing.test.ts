/**
 * RevenueCat adapter — falha graciosa sem keys/SDK.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  RevenueCatBillingProvider,
  getRevenueCatConfig,
  revenueCatUnavailableMessage,
} from '@/services/subscription/RevenueCatBillingProvider';

describe('RevenueCatBillingProvider', () => {
  const env = { ...process.env };
  const provider = new RevenueCatBillingProvider();

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it('não está ready sem provider revenuecat', () => {
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    expect(getRevenueCatConfig().ready).toBe(false);
  });

  it('não está ready sem API key', () => {
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'revenuecat';
    process.env.EXPO_PUBLIC_RC_ENABLED = 'true';
    delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
    expect(getRevenueCatConfig().hasApiKey).toBe(false);
    expect(getRevenueCatConfig().ready).toBe(false);
  });

  it('mensagem amigável quando falta key', () => {
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'revenuecat';
    const msg = revenueCatUnavailableMessage();
    expect(msg).toContain('API key');
  });

  it('purchase pago falha sem degradar tier local', async () => {
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'revenuecat';
    const result = await provider.purchase('user-rc-test', 'plus_monthly');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('restore retorna tier local quando não ready', async () => {
    const tier = await provider.restore('user-rc-restore');
    expect(['free', 'plus_monthly', 'plus_annual']).toContain(tier);
  });
});
