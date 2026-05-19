/**
 * Entitlements — o que cada tier pode acessar.
 */

import type { MascotPhase } from '@/types';
import type { BillingTierId } from '@/content/billing';

const FREE_MAX_PHASE: MascotPhase = 'adolescente';
const PREMIUM_MAX_PHASE: MascotPhase = 'evoluido';

const FREE_DAILY_CHAT = 10;

export class EntitlementService {
  canEvolveToPhase(tier: BillingTierId, phase: MascotPhase): boolean {
    const max = tier === 'free' ? FREE_MAX_PHASE : PREMIUM_MAX_PHASE;
    const order: MascotPhase[] = ['ovo', 'bebe', 'crianca', 'adolescente', 'adulto', 'evoluido'];
    return order.indexOf(phase) <= order.indexOf(max);
  }

  dailyChatLimit(tier: BillingTierId): number | null {
    return tier === 'free' ? FREE_DAILY_CHAT : null;
  }

  canAccessScene(tier: BillingTierId, sceneId: string): boolean {
    if (tier !== 'free') return true;
    return sceneId === 'room';
  }

  canExportReport(tier: BillingTierId): boolean {
    return tier !== 'free';
  }

  canViewFullWeeklyReport(tier: BillingTierId): boolean {
    return tier !== 'free';
  }

  canPreviewWeeklyReport(tier: BillingTierId): boolean {
    return true;
  }

  canAccessPremiumMutation(tier: BillingTierId, rarity: string): boolean {
    if (tier !== 'free') return true;
    return rarity === 'common' || rarity === 'rare';
  }

  canAccessLegendaryForm(tier: BillingTierId): boolean {
    return tier !== 'free';
  }

  canAccessRareScenario(tier: BillingTierId): boolean {
    return tier !== 'free';
  }

  unlimitedStreakFreeze(tier: BillingTierId): boolean {
    return tier !== 'free';
  }
}

export const entitlementService = new EntitlementService();
