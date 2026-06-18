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

/**
 * Resolve o IDENTIFIER do PACOTE na offering RevenueCat por tier.
 *
 * ⚠️ Isto é o `package.identifier` dentro da offering (o que `availablePackages
 * .find(p => p.identifier === …)` casa) — NÃO o SKU de produto da loja
 * (`mascote_plus_monthly`), que vive em `tierFromEntitlements` via
 * `productIdentifier`. São namespaces distintos no RevenueCat.
 *
 * Configurável via env pra casar com o que o dashboard usar SEM redeploy; o
 * fallback preserva o histórico ('plus_monthly'/'plus_annual'). Antes era
 * hardcoded — se o dashboard nomeasse os pacotes diferente, a compra falhava em
 * silêncio (fail-closed em purchaseRevenueCatTier devolvia "pacote não
 * encontrado"). Agora basta setar a env certa.
 */
export function packageIdForTier(tier: Exclude<BillingTierId, 'free'>): string {
  if (tier === 'plus_annual') {
    return process.env.EXPO_PUBLIC_RC_PKG_PLUS_ANNUAL?.trim() || 'plus_annual';
  }
  return process.env.EXPO_PUBLIC_RC_PKG_PLUS_MONTHLY?.trim() || 'plus_monthly';
}

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
  active: Record<string, { isActive?: boolean; productIdentifier?: string }> | undefined,
): BillingTierId {
  if (!active) return 'free';
  const keys = Object.keys(active);
  if (keys.length === 0) return 'free';
  // Resolve pelo productIdentifier (SKU = nosso ProductId `mascote_plus_annual`/
  // `_monthly`), com fallback pro nome da key. Os entitlements documentados
  // (SubscriptionTypes.EntitlementId) são 'premium'|'legendary'|'ai_plus' —
  // NENHUM contém "annual"; casar só pelo nome do entitlement mapeava assinante
  // anual → plus_monthly em silêncio (perdia a forma legendary). Travado por
  // tests/services/revenuecat-sku-failclosed.test.ts ('resolução de tier').
  const haystack = keys
    .map(k => `${k} ${active[k]?.productIdentifier ?? ''}`)
    .join(' ')
    .toLowerCase();
  if (haystack.includes('annual')) return 'plus_annual';
  // 'legendary' é entitlement ANUAL-exclusivo (TIER_TO_ENTITLEMENTS.plus_annual).
  // Sua mera presença é um sinal de anual mais confiável que o substring 'annual'
  // no productIdentifier — que a RC pode omitir. Sem isso, um assinante anual cujo
  // payload chega como {premium, legendary} sem 'annual' cairia em plus_monthly,
  // rebaixando em silêncio a forma legendary que ele pagou.
  if (haystack.includes('legendary')) return 'plus_annual';
  if (haystack.includes('monthly') || haystack.includes('plus') || haystack.includes('premium')) {
    return 'plus_monthly';
  }
  return 'plus_monthly';
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
    const pkgId = packageIdForTier(tier);
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

  // PROPAGA o erro em vez de devolver 'free'. Antes: qualquer falha (rede,
  // loja fora do ar, RC 5xx) virava 'free', e o caller (provider/Service)
  // interpretava isso como "conta sem assinatura" e REBAIXAVA um assinante
  // pagante a free num blip transitório de rede. 'free' deve significar
  // apenas "a loja confirmou que não há entitlement ativo" — erro != ausência.
  // O RestorePurchasesService já tem catch que preserva o tier anterior.
  const customerInfo = await Purchases.restorePurchases();
  return tierFromEntitlements(customerInfo.entitlements.active);
}

/**
 * Lê o entitlement ATUAL do RevenueCat via getCustomerInfo (NÃO dispara restore
 * — é uma leitura barata do estado cacheado/atual). Usado pra sincronizar o tier
 * local no launch e pegar cancelamento/expiração feitos PELA LOJA (que nunca
 * chegam ao app sozinhos). PROPAGA erro pro caller preservar o tier atual —
 * 'free' só quando a loja CONFIRMA ausência de entitlement, nunca num blip.
 */
export async function getRevenueCatEntitlementTier(): Promise<BillingTierId> {
  const Purchases = await loadPurchases();
  if (!Purchases || !sdkInitialized) return 'free';
  const customerInfo = await Purchases.getCustomerInfo();
  return tierFromEntitlements(customerInfo.entitlements.active);
}
