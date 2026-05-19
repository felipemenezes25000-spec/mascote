/**
 * Testes de subscription e entitlements.
 */

import { describe, it, expect } from 'vitest';
import { entitlementService } from '@/services/subscription/EntitlementService';

describe('EntitlementService', () => {
  it('free não evolui além de adolescente', () => {
    expect(entitlementService.canEvolveToPhase('free', 'adolescente')).toBe(true);
    expect(entitlementService.canEvolveToPhase('free', 'adulto')).toBe(false);
    expect(entitlementService.canEvolveToPhase('plus_monthly', 'evoluido')).toBe(true);
  });

  it('limite de chat free = 10', () => {
    expect(entitlementService.dailyChatLimit('free')).toBe(10);
    expect(entitlementService.dailyChatLimit('plus_annual')).toBeNull();
  });

  it('cenários premium bloqueados no free', () => {
    expect(entitlementService.canAccessScene('free', 'room')).toBe(true);
    expect(entitlementService.canAccessScene('free', 'moon')).toBe(false);
    expect(entitlementService.canAccessScene('plus_monthly', 'moon')).toBe(true);
  });

  it('weekly report preview vs full', () => {
    expect(entitlementService.canPreviewWeeklyReport('free')).toBe(true);
    expect(entitlementService.canViewFullWeeklyReport('free')).toBe(false);
    expect(entitlementService.canExportReport('plus_annual')).toBe(true);
  });

  it('mutações lendárias exigem Plus', () => {
    expect(entitlementService.canAccessPremiumMutation('free', 'legendary')).toBe(false);
    expect(entitlementService.canAccessPremiumMutation('plus_monthly', 'legendary')).toBe(true);
  });
});
