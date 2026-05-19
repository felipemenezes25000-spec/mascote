/**
 * Factory do provedor de billing — mock local ou RevenueCat (produção).
 */

import { mockBillingProvider } from './MockBillingProvider';
import { revenueCatBillingProvider } from './RevenueCatBillingProvider';

export type BillingProviderKind = 'mock' | 'revenuecat';

const PROVIDER: BillingProviderKind =
  (process.env.EXPO_PUBLIC_BILLING_PROVIDER as BillingProviderKind | undefined) ?? 'mock';

export function getBillingProvider() {
  return PROVIDER === 'revenuecat' ? revenueCatBillingProvider : mockBillingProvider;
}
