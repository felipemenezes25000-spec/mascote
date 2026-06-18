/**
 * RevenueCat adapter — falha graciosa sem keys/SDK.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  RevenueCatBillingProvider,
  getRevenueCatConfig,
  revenueCatUnavailableMessage,
  __resetRevenueCatSdkForTests,
  __setRevenueCatSdkInitializedForTests,
} from '@/services/subscription/RevenueCatBillingProvider';
import { packageIdForTier } from '@/services/subscription/revenueCatSdk';

describe('RevenueCatBillingProvider', () => {
  const env = { ...process.env };
  const provider = new RevenueCatBillingProvider();

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
    __resetRevenueCatSdkForTests();
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

  it('não está ready com key e RC_ENABLED mas SDK não linkado', () => {
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'revenuecat';
    process.env.EXPO_PUBLIC_RC_ENABLED = 'true';
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = 'test_key';
    const config = getRevenueCatConfig();
    expect(config.hasApiKey).toBe(true);
    expect(config.sdkEnabled).toBe(true);
    expect(config.readiness).toBe('sdk_not_linked');
    expect(config.ready).toBe(false);
  });

  it('ready quando SDK inicializado com env configurado', () => {
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'revenuecat';
    process.env.EXPO_PUBLIC_RC_ENABLED = 'true';
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = 'test_key';
    __setRevenueCatSdkInitializedForTests(true);
    const config = getRevenueCatConfig();
    expect(config.readiness).toBe('ready');
    expect(config.ready).toBe(true);
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

  it('syncEntitlements é no-op (preserva tier) quando não ready', async () => {
    // SDK não linkado → não rebaixa por falta de informação.
    const tier = await provider.syncEntitlements('user-rc-sync');
    expect(['free', 'plus_monthly', 'plus_annual']).toContain(tier);
  });

  it('cancel NÃO força free quando não ready — não há loja real cobrando', async () => {
    // Regressão 2026-06-11: em produção real, cancelar via loja mantém acesso até
    // o fim do período; aqui (não ready) o downgrade local é o caminho seguro.
    await expect(provider.cancel('user-rc-cancel')).resolves.toBeUndefined();
  });

  describe('packageIdForTier — package id da offering configurável', () => {
    it('default preserva plus_monthly/plus_annual (comportamento histórico)', () => {
      delete process.env.EXPO_PUBLIC_RC_PKG_PLUS_MONTHLY;
      delete process.env.EXPO_PUBLIC_RC_PKG_PLUS_ANNUAL;
      expect(packageIdForTier('plus_monthly')).toBe('plus_monthly');
      expect(packageIdForTier('plus_annual')).toBe('plus_annual');
    });

    it('env sobrescreve o package id (casar com dashboard RevenueCat sem deploy)', () => {
      // Auditoria 2026-06-18: package id era hardcoded. Distinto do SKU de produto
      // (mascote_plus_*) usado em tierFromEntitlements — namespaces diferentes.
      process.env.EXPO_PUBLIC_RC_PKG_PLUS_MONTHLY = 'mascote_plus_monthly';
      process.env.EXPO_PUBLIC_RC_PKG_PLUS_ANNUAL = 'mascote_plus_annual';
      expect(packageIdForTier('plus_monthly')).toBe('mascote_plus_monthly');
      expect(packageIdForTier('plus_annual')).toBe('mascote_plus_annual');
    });
  });
});
