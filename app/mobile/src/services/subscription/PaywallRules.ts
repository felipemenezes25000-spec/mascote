/**
 * Regras centralizadas de paywall — quando bloquear vs permitir preview.
 * Complementa lib/paywall-triggers (gatilhos contextuais).
 */

import type { BillingTierId } from '@/content/billing';
import type { MascotPhase } from '@/types';
import { entitlementService } from './EntitlementService';
import { hasEntitlement, type EntitlementId } from './SubscriptionTypes';
import { isDemoBilling } from './billing-provider';

export type PaywallFeature =
  | 'full_weekly_report'
  | 'export_report'
  | 'premium_scene'
  | 'unlimited_chat'
  | 'legendary_mutation'
  | 'evolution_phase'
  | 'ai_plus';

export interface PaywallDecision {
  allowed: boolean;
  showPaywall: boolean;
  reason?: string;
  demoMode: boolean;
}

export function evaluatePaywall(
  tier: BillingTierId,
  feature: PaywallFeature,
  ctx?: { sceneId?: string; phase?: MascotPhase; mutationRarity?: string },
): PaywallDecision {
  const demoMode = isDemoBilling();

  switch (feature) {
    case 'full_weekly_report':
      return gate(entitlementService.canViewFullWeeklyReport(tier), 'Relatório completo é Plus.');
    case 'export_report':
      return gate(entitlementService.canExportReport(tier), 'Exportação é Plus.');
    case 'premium_scene':
      return gate(
        entitlementService.canAccessScene(tier, ctx?.sceneId ?? 'room'),
        'Este cenário é Plus.',
      );
    case 'unlimited_chat':
      return gate(entitlementService.dailyChatLimit(tier) === null, 'Chat ilimitado é Plus.');
    case 'legendary_mutation':
      return gate(
        entitlementService.canAccessPremiumMutation(tier, ctx?.mutationRarity ?? 'legendary'),
        'Mutações lendárias são Plus.',
      );
    case 'evolution_phase':
      return gate(
        ctx?.phase ? entitlementService.canEvolveToPhase(tier, ctx.phase) : tier !== 'free',
        'Evolução além de Adolescente é Plus.',
      );
    case 'ai_plus':
      return gate(hasEntitlement(tier, 'ai_plus'), 'IA avançada é Plus.');
    default:
      return { allowed: true, showPaywall: false, demoMode };
  }
}

function gate(allowed: boolean, reason: string): PaywallDecision {
  return {
    allowed,
    showPaywall: !allowed,
    reason: allowed ? undefined : reason,
    demoMode: isDemoBilling(),
  };
}

export function requiredEntitlement(feature: PaywallFeature): EntitlementId | null {
  if (feature === 'ai_plus') return 'ai_plus';
  if (feature === 'legendary_mutation') return 'legendary';
  if (feature === 'full_weekly_report' || feature === 'export_report') return 'premium';
  return 'premium';
}
