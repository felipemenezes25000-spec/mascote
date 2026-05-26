/**
 * Configuração central de billing — demo vs produção RevenueCat.
 */

import {
  getRevenueCatConfig,
  revenueCatUnavailableMessage,
  type RevenueCatConfig,
} from '@/services/subscription/RevenueCatBillingProvider';

export type BillingProviderKind = 'mock' | 'revenuecat';

export type BillingRuntimeMode = 'demo' | 'production_ready' | 'production_misconfigured';

export interface BillingEnvValidation {
  provider: BillingProviderKind;
  mode: BillingRuntimeMode;
  canPurchase: boolean;
  label: string;
  detail: string;
  revenueCat: RevenueCatConfig;
}

export function getBillingProviderKind(): BillingProviderKind {
  const raw = process.env.EXPO_PUBLIC_BILLING_PROVIDER;
  return raw === 'revenuecat' ? 'revenuecat' : 'mock';
}

export function validateBillingEnv(): BillingEnvValidation {
  const provider = getBillingProviderKind();
  const revenueCat = getRevenueCatConfig();

  if (provider === 'mock') {
    return {
      provider,
      mode: 'demo',
      canPurchase: true,
      label: 'Modo demo',
      detail: 'Compras simuladas localmente — ideal para desenvolvimento e QA.',
      revenueCat,
    };
  }

  if (revenueCat.readiness === 'ready') {
    return {
      provider,
      mode: 'production_ready',
      canPurchase: true,
      label: 'Produção (RevenueCat)',
      detail: 'Compras nativas via App Store / Google Play.',
      revenueCat,
    };
  }

  if (revenueCat.readiness === 'sdk_not_linked') {
    // Env vars OK mas o módulo nativo react-native-purchases não foi linkado
    // neste build — não dá pra cobrar. Era 'production_ready' aqui, o que
    // ESCAPAVA `assertProductionConfig()` (runtime-config.ts:101 só barra
    // 'production_misconfigured'), permitindo subir build de produção sem
    // billing real funcionando.
    return {
      provider,
      mode: 'production_misconfigured',
      canPurchase: false,
      label: 'Produção (SDK pendente)',
      detail:
        'RevenueCat configurado por variáveis de ambiente. Inicialize react-native-purchases neste build para cobrar.',
      revenueCat,
    };
  }

  return {
    provider,
    mode: 'production_misconfigured',
    canPurchase: false,
    label: 'Produção incompleta',
    detail: revenueCatUnavailableMessage(revenueCat),
    revenueCat,
  };
}
