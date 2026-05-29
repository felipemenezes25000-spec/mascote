/**
 * Camada fina sobre react-native-purchases — init, compra e restore.
 * Falha graciosamente em Expo Go / Vitest (módulo nativo ausente).
 */

import { Platform } from 'react-native';
import type { BillingTierId } from '@/content/billing';
import { logger } from '@/lib/logger';

let sdkInitialized = false;

export function isRevenueCatSdkInitialized(): boolean {
  return sdkInitialized;
}

export function markSdkInitialized(): void {
  sdkInitialized = true;
}

export function markSdkUninitialized(): void {
  sdkInitialized = false;
}

/** Apenas testes — não usar em produção. */
export function __resetRevenueCatSdkForTests(): void {
  sdkInitialized = false;
}

/** Apenas testes — simula SDK inicializado sem módulo nativo. */
export function __setRevenueCatSdkInitializedForTests(value: boolean): void {
  sdkInitialized = value;
}

const TIER_PACKAGE_IDS: Record<Exclude<BillingTierId, 'free'>, string> = {
  plus_monthly: 'plus_monthly',
  plus_annual: 'plus_annual',
};

function resolveApiKey(): string | undefined {
  const ios = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS?.trim();
  const android = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID?.trim();
  const generic = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();
  if (Platform.OS === 'ios') return ios ?? generic;
  if (Platform.OS === 'android') return android ?? generic;
  return generic ?? ios ?? android;
}

type PurchasesModule = typeof import('react-native-purchases').default;

async function loadPurchases(): Promise<PurchasesModule | null> {
  try {
    const mod = await import('react-native-purchases');
    return mod.default;
  } catch {
    return null;
  }
}

function tierFromEntitlements(
  active: Record<string, { isActive?: boolean }> | undefined,
): BillingTierId {
  if (!active) return 'free';
  const keys = Object.keys(active);
  if (keys.some(k => k.includes('annual'))) return 'plus_annual';
  if (keys.some(k => k.includes('plus') || k.includes('premium'))) return 'plus_monthly';
  if (keys.length > 0) return 'plus_monthly';
  return 'free';
}

export async function initRevenueCatSdk(userId?: string): Promise<boolean> {
  if (process.env.EXPO_PUBLIC_BILLING_PROVIDER !== 'revenuecat') return false;
  if (process.env.EXPO_PUBLIC_RC_ENABLED !== 'true') return false;

  const apiKey = resolveApiKey();
  if (!apiKey) return false;

  const Purchases = await loadPurchases();
  if (!Purchases) {
    logger.dev('[billing] react-native-purchases não disponível neste runtime');
    markSdkUninitialized();
    return false;
  }

  try {
    Purchases.configure({ apiKey, appUserID: userId ?? undefined });
    if (userId) {
      await Purchases.logIn(userId);
    }
    markSdkInitialized();
    logger.dev('[billing] RevenueCat SDK inicializado');
    return true;
  } catch (err) {
    markSdkUninitialized();
    logger.error('[billing] RevenueCat init falhou', { err });
    return false;
  }
}

export async function purchaseRevenueCatTier(
  tier: Exclude<BillingTierId, 'free'>,
): Promise<{ success: boolean; tier: BillingTierId; error?: string }> {
  const Purchases = await loadPurchases();
  if (!Purchases || !sdkInitialized) {
    return { success: false, tier: 'free', error: 'SDK RevenueCat não inicializado.' };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const pkgId = TIER_PACKAGE_IDS[tier];
    // Fail-closed: SÓ compra o pacote exato que o usuário pediu. Antes havia um
    // fallback `?? availablePackages[0]` — se o ID não batesse (ex.: SKU do
    // dashboard RevenueCat diferente), cobrava um pacote QUALQUER em silêncio
    // (usuário pede anual, leva mensal). Em fluxo de dinheiro, recusar é mais
    // seguro do que cobrar o produto errado.
    const pkg = offerings.current?.availablePackages.find(p => p.identifier === pkgId);

    if (!pkg) {
      return {
        success: false,
        tier: 'free',
        error: `Pacote "${pkgId}" não encontrado no RevenueCat.`,
      };
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const resolved = tierFromEntitlements(customerInfo.entitlements.active);
    return { success: resolved !== 'free', tier: resolved };
  } catch (err: unknown) {
    const cancelled = (err as { userCancelled?: boolean })?.userCancelled;
    if (cancelled) {
      return { success: false, tier: 'free', error: 'Compra cancelada.' };
    }
    const message = err instanceof Error ? err.message : 'Erro na compra.';
    return { success: false, tier: 'free', error: message };
  }
}

export async function restoreRevenueCatPurchases(): Promise<BillingTierId> {
  const Purchases = await loadPurchases();
  if (!Purchases || !sdkInitialized) return 'free';

  try {
    const customerInfo = await Purchases.restorePurchases();
    return tierFromEntitlements(customerInfo.entitlements.active);
  } catch {
    return 'free';
  }
}
