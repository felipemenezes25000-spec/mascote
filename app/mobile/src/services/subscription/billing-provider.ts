/**
 * Factory do provedor de billing — mock local ou RevenueCat (produção).
 *
 * Em produção (`EXPO_PUBLIC_ENV=production`) com provider=mock, marcamos o
 * runtime como "demo mode" para que o paywall/UI exibam o aviso honesto em
 * vez de simular compra real. Não bloqueamos o app — devs/QA podem ainda
 * iterar com mock — mas a UI nunca pode mostrar "compra concluída" sem ser
 * de fato pelo provedor real.
 */

import { logger } from '@/lib/logger';
import { mockBillingProvider } from './MockBillingProvider';
import { revenueCatBillingProvider } from './RevenueCatBillingProvider';

export type BillingProviderKind = 'mock' | 'revenuecat';

const PROVIDER: BillingProviderKind =
  (process.env.EXPO_PUBLIC_BILLING_PROVIDER as BillingProviderKind | undefined) ?? 'mock';

const ENV = (process.env.EXPO_PUBLIC_ENV ?? process.env.NODE_ENV ?? 'development').toLowerCase();
const IS_PRODUCTION_BUILD = ENV === 'production';

let warned = false;
function warnOnceIfMockInProd(): void {
  if (warned) return;
  if (PROVIDER === 'mock' && IS_PRODUCTION_BUILD) {
    warned = true;
    logger.warn(
      '[billing] Mock provider active in production build — paywall will render in demo mode (no real charges).',
      { provider: PROVIDER, env: ENV },
    );
  }
}

export function getBillingProvider() {
  warnOnceIfMockInProd();
  return PROVIDER === 'revenuecat' ? revenueCatBillingProvider : mockBillingProvider;
}

export function getBillingProviderKind(): BillingProviderKind {
  return PROVIDER;
}

/**
 * UI usa isto pra decidir se o paywall mostra a tarja "modo demo" e bloqueia
 * texto enganoso. Retorna `true` se NÃO estamos rodando billing real.
 */
export function isDemoBilling(): boolean {
  return PROVIDER !== 'revenuecat';
}

/**
 * `true` quando o app está em build de produção rodando com mock.
 * Não bloqueamos o app (dev iteration), mas a UI deve banner amarelo.
 */
export function isMockInProductionBuild(): boolean {
  return PROVIDER === 'mock' && IS_PRODUCTION_BUILD;
}
