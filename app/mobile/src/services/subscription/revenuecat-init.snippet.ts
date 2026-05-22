/**
 * RevenueCat init — snippet pra colar em `app/_layout.tsx` (ou onde quer
 * que o app inicialize SDKs nativos uma única vez).
 *
 * Este arquivo é DOCUMENTAÇÃO + CÓDIGO INERTE. Importar dele NÃO inicializa
 * nada. Pra ativar, copie a função `initRevenueCat` pro layout root.
 *
 * **Por que snippet em vez de exportar pronto:**
 *  - `react-native-purchases` NÃO está no `package.json` ainda
 *  - Adicionar SDK nativo exige `npx expo install react-native-purchases`
 *    + rebuild EAS (não funciona em Expo Go)
 *  - Deixar import top-level quebra dev em web/Expo Go
 *
 * Quando você tiver o SDK linkado, copie pro layout assim:
 *
 *   // app/_layout.tsx
 *   import { initRevenueCat } from '@/services/subscription/revenuecat-init.snippet';
 *   useEffect(() => { void initRevenueCat(profile?.id); }, [profile?.id]);
 */

import { Platform } from 'react-native';
import { logger } from '@/lib/logger';
import {
  getRevenueCatConfig,
  revenueCatUnavailableMessage,
} from './RevenueCatBillingProvider';

/**
 * Snippet de inicialização — COPIE pro layout root após adicionar o SDK.
 *
 * Como rodar (uma vez, na primeira render de Layout):
 *
 *   await initRevenueCat(userId);
 *
 * Idempotente — chama uma vez por sessão. Se as keys não estiverem
 * configuradas, loga warning e retorna sem crashar.
 */
export async function initRevenueCat(userId: string | undefined): Promise<void> {
  const config = getRevenueCatConfig();

  if (!config.ready) {
    logger.dev('[billing] RevenueCat skip init', {
      reason: revenueCatUnavailableMessage(config),
      readiness: config.readiness,
    });
    return;
  }

  // ⚠️ DESCOMENTAR após `npx expo install react-native-purchases`
  // import Purchases from 'react-native-purchases';
  //
  // const apiKey =
  //   Platform.OS === 'ios'
  //     ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
  //     : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
  //
  // if (!apiKey) {
  //   logger.warn('[billing] RevenueCat key missing pra plataforma', { os: Platform.OS });
  //   return;
  // }
  //
  // try {
  //   Purchases.configure({ apiKey, appUserID: userId });
  //   // (Opcional) Setar atributos pra ter contexto no dashboard RC
  //   // await Purchases.setAttributes({ tier_local: 'free' });
  //   logger.dev('[billing] RevenueCat configurado', { os: Platform.OS });
  // } catch (err) {
  //   logger.warn('[billing] RevenueCat init falhou', {
  //     error: err instanceof Error ? err.message : String(err),
  //   });
  // }
  //
  // (Stub atual — substituir pelo bloco acima quando SDK estiver linkado)
  logger.dev('[billing] RevenueCat snippet preparado mas SDK não linkado', {
    os: Platform.OS,
    userId: userId ? 'present' : 'missing',
  });
}

/**
 * Implementação real de `purchase()` quando SDK estiver linkado.
 * Copie/cole pro RevenueCatBillingProvider.purchase() substituindo o stub atual.
 */
export const PURCHASE_IMPLEMENTATION_SNIPPET = `
// ⚠️ Em RevenueCatBillingProvider.ts, substitua o body de purchase() por:
//
// import Purchases, { PurchasesError } from 'react-native-purchases';
//
// const offerings = await Purchases.getOfferings();
// const offering = offerings.current;
// if (!offering) return { success: false, tier: current, error: 'no_offering' };
//
// const pkg = offering.availablePackages.find(p => p.product.identifier === skuFor(tier));
// if (!pkg) return { success: false, tier: current, error: 'no_package' };
//
// try {
//   const { customerInfo } = await Purchases.purchasePackage(pkg);
//   const newTier = tierFromEntitlements(customerInfo.entitlements);
//   await localSubscriptionRepo.setTier(userId, newTier);
//   return { success: true, tier: newTier };
// } catch (e) {
//   const err = e as PurchasesError;
//   if (err.userCancelled) {
//     return { success: false, tier: current, error: 'user_cancelled' };
//   }
//   return { success: false, tier: current, error: err.code ?? 'unknown' };
// }
`;
