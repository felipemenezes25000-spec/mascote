/**
 * Testes de billing — paywall rules, erros, restore.
 */

import { describe, it, expect } from 'vitest';
import { evaluatePaywall, requiredEntitlement } from '@/services/subscription/PaywallRules';
import { mapPurchaseError } from '@/services/subscription/PurchaseErrorMapper';
import { entitlementsForTier, hasEntitlement } from '@/services/subscription/SubscriptionTypes';

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
