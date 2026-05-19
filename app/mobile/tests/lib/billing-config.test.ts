import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateBillingEnv } from '@/lib/billing-config';

describe('validateBillingEnv', () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it('modo demo com mock', () => {
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    const v = validateBillingEnv();
    expect(v.mode).toBe('demo');
    expect(v.canPurchase).toBe(true);
  });

  it('produção sem keys bloqueia compra', () => {
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'revenuecat';
    delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
    const v = validateBillingEnv();
    expect(v.mode).toBe('production_misconfigured');
    expect(v.canPurchase).toBe(false);
  });
});
