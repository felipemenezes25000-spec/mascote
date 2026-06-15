/**
 * Testes de billing — paywall rules, erros, restore.
 */

import { describe, it, expect, vi } from 'vitest';
import { evaluatePaywall, requiredEntitlement } from '@/services/subscription/PaywallRules';
import { mapPurchaseError } from '@/services/subscription/PurchaseErrorMapper';
import { entitlementsForTier, hasEntitlement } from '@/services/subscription/SubscriptionTypes';
import { mockBillingProvider } from '@/services/subscription/MockBillingProvider';
import { localSubscriptionRepo } from '@/repositories/local';
import { getBillingProviderKind } from '@/services/subscription/billing-provider';

describe('PaywallRules', () => {
  it('free bloqueia relatório completo', () => {
    const d = evaluatePaywall('free', 'full_weekly_report');
    expect(d.allowed).toBe(false);
    expect(d.showPaywall).toBe(true);
  });

  it('plus libera chat ilimitado', () => {
    const d = evaluatePaywall('plus_monthly', 'unlimited_chat');
    expect(d.allowed).toBe(true);
  });

  it('requiredEntitlement mapeia ai_plus', () => {
    expect(requiredEntitlement('ai_plus')).toBe('ai_plus');
  });

  // Regressão (2026-06-15 ajuste1): mutação LENDÁRIA é anual-exclusiva. plus_monthly
  // não pode passar pelo gate de legendary_mutation (era liberado por
  // canAccessPremiumMutation, que só barra free).
  it('legendary_mutation: anual libera, mensal bloqueia, raridade menor segue tier pago', () => {
    expect(evaluatePaywall('plus_annual', 'legendary_mutation').allowed).toBe(true);
    expect(evaluatePaywall('plus_monthly', 'legendary_mutation').allowed).toBe(false);
    expect(evaluatePaywall('free', 'legendary_mutation').allowed).toBe(false);
    // raridade não-lendária: tier pago basta (epic), free segue regra de raridade.
    expect(
      evaluatePaywall('plus_monthly', 'legendary_mutation', { mutationRarity: 'epic' }).allowed,
    ).toBe(true);
    expect(
      evaluatePaywall('free', 'legendary_mutation', { mutationRarity: 'rare' }).allowed,
    ).toBe(true);
  });
});

describe('PurchaseErrorMapper', () => {
  it('mapeia cancelamento', () => {
    const e = mapPurchaseError('user_cancelled');
    expect(e.recoverable).toBe(true);
    expect(e.userMessage).toMatch(/cancelada/i);
  });

  it('fallback para erro desconhecido', () => {
    const e = mapPurchaseError('RC_UNKNOWN_XYZ');
    expect(e.code).toBe('unknown');
    expect(e.userMessage.length).toBeGreaterThan(10);
  });
});

describe('SubscriptionTypes', () => {
  it('plus anual inclui legendary', () => {
    expect(hasEntitlement('plus_annual', 'legendary')).toBe(true);
    expect(entitlementsForTier('free')).toEqual([]);
  });
});

describe('MockBillingProvider production guard', () => {
  it('bloqueia compra mock quando NODE_ENV=production e __DEV__ false', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    await localSubscriptionRepo.setTier('billing-guard-user', 'free');
    const result = await mockBillingProvider.purchase('billing-guard-user', 'plus_monthly');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/bloqueado/i);
    process.env.NODE_ENV = prevEnv;
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
  });
});

describe('Billing provider selection guard', () => {
  it('força RevenueCat quando EXPO_PUBLIC_ENV=production mesmo com provider mock', async () => {
    const prevEnv = process.env.EXPO_PUBLIC_ENV;
    const prevProvider = process.env.EXPO_PUBLIC_BILLING_PROVIDER;
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    vi.resetModules();

    const { getBillingProviderKind: getKindFresh } = await import(
      '@/services/subscription/billing-provider'
    );
    expect(getKindFresh()).toBe('revenuecat');

    process.env.EXPO_PUBLIC_ENV = prevEnv;
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = prevProvider;
    vi.resetModules();
    expect(['mock', 'revenuecat']).toContain(getBillingProviderKind());
  });
});
