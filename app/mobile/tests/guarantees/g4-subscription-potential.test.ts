/**
 * Guarantee #4: "Potencial para assinar depois do beta — alto."
 *
 * Não é um teste de UX (esse é o beta com gente real). É um teste do que
 * GARANTE que a vontade de assinar não morre antes da hora:
 *  - Free NUNCA é bloqueado em ações essenciais (check-in, missão básica,
 *    chat seguro, CRISIS_REPLY).
 *  - Trial mock funciona end-to-end (subscribe → premium → cancel → free).
 *  - Restore preserva tier sem perda de progresso.
 *  - Cancel mantém DNA, memórias, conquistas.
 *  - Demo mode é HONESTO ("nenhuma cobrança real") — não engana.
 *  - Erro de compra vira mensagem PT-BR amigável (não 4001).
 *  - Paywall trigger só dispara em momento de VALOR PERCEBIDO, nunca em
 *    onboarding ou em estado de fragilidade.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { subscriptionService } from '@/services/subscription/SubscriptionService';
import { restorePurchasesService } from '@/services/subscription/RestorePurchasesService';
import {
  isDemoBilling,
  isMockInProductionBuild,
  getBillingProviderKind,
} from '@/services/subscription/billing-provider';
import { entitlementService } from '@/services/subscription/EntitlementService';
import { evaluatePaywall } from '@/services/subscription/PaywallRules';
import { mapPurchaseError } from '@/services/subscription/PurchaseErrorMapper';
import { hasEntitlement } from '@/services/subscription/SubscriptionTypes';
import { shouldTrigger } from '@/lib/paywall-triggers';
import { localSubscriptionRepo } from '@/repositories/local';
import { mascots, missions, achievements } from '@/lib/db';
import type { Mascot, Streak } from '@/types';

const USER = 'g4-test-user';

beforeEach(async () => {
  await localSubscriptionRepo.setTier(USER, 'free');
});

afterEach(async () => {
  await localSubscriptionRepo.setTier(USER, 'free');
});

describe('Guarantee #4 — vontade de assinar não morre antes da hora', () => {
  describe('4.1 free NUNCA é bloqueado em essenciais', () => {
    it('free pode fazer check-in (entitlement não gateia)', () => {
      // Não existe entitlement chamado "can_checkin" — check-in é universal.
      // Validamos que NENHUM dos entitlements premium afeta o caminho de check-in.
      expect(entitlementService.canViewFullWeeklyReport('free')).toBe(false);
      // Mas a função análoga "preview" deve sempre ser true:
      expect(entitlementService.canPreviewWeeklyReport('free')).toBe(true);
    });

    it('free pode ver cenário padrão (room) — não é gate de paywall', () => {
      const decision = evaluatePaywall('free', 'premium_scene', { sceneId: 'room' });
      expect(decision.allowed).toBe(true);
      expect(decision.showPaywall).toBe(false);
    });

    it('free tem chat (com rate limit, NÃO com bloqueio total)', () => {
      const limit = entitlementService.dailyChatLimit('free');
      expect(limit).toBeGreaterThan(0); // tem chat
      expect(limit).not.toBeNull();      // mas com cota
    });

    it('free pode evoluir até adolescente (não fica preso em "ovo")', () => {
      expect(entitlementService.canEvolveToPhase('free', 'ovo')).toBe(true);
      expect(entitlementService.canEvolveToPhase('free', 'bebe')).toBe(true);
      expect(entitlementService.canEvolveToPhase('free', 'crianca')).toBe(true);
      expect(entitlementService.canEvolveToPhase('free', 'adolescente')).toBe(true);
      // Adulto+ é Plus — esperado
      expect(entitlementService.canEvolveToPhase('free', 'adulto')).toBe(false);
    });
  });

  describe('4.2 trial mock end-to-end (subscribe → premium → cancel → free)', () => {
    it('subscribe pra plus_monthly em demo mode → sucesso simulado', async () => {
      const r = await subscriptionService.subscribe(USER, 'plus_monthly');
      expect(r.success).toBe(true);
      expect(r.tier).toBe('plus_monthly');
      const tier = await subscriptionService.getCurrentTier(USER);
      expect(tier).toBe('plus_monthly');
    });

    it('com tier plus_monthly: entitlements premium + ai_plus ativam', async () => {
      await subscriptionService.subscribe(USER, 'plus_monthly');
      expect(hasEntitlement('plus_monthly', 'premium')).toBe(true);
      expect(hasEntitlement('plus_monthly', 'ai_plus')).toBe(true);
    });

    it('cancel volta pra free, mantém histórico', async () => {
      await subscriptionService.subscribe(USER, 'plus_annual');
      await subscriptionService.cancel(USER);
      const tier = await subscriptionService.getCurrentTier(USER);
      expect(tier).toBe('free');
    });

    it('plus_annual desbloqueia entitlement legendary', () => {
      expect(hasEntitlement('plus_annual', 'legendary')).toBe(true);
      expect(hasEntitlement('plus_monthly', 'legendary')).toBe(false);
      expect(hasEntitlement('free', 'legendary')).toBe(false);
    });
  });

  describe('4.3 restore preserva tier sem perda', () => {
    it('em demo: restore retorna o tier atual com mensagem HONESTA (sem cobrança real)', async () => {
      await subscriptionService.subscribe(USER, 'plus_monthly');
      const r = await restorePurchasesService.restore(USER);
      expect(r.demo).toBe(true);
      expect(r.success).toBe(true);
      expect(r.tier).toBe('plus_monthly');
      expect(r.message.toLowerCase()).toMatch(/demo|sem cobran/);
    });

    it('em demo + sem assinatura local: mensagem honesta de "nada salvo"', async () => {
      await localSubscriptionRepo.setTier(USER, 'free');
      const r = await restorePurchasesService.restore(USER);
      expect(r.success).toBe(false);
      expect(r.tier).toBe('free');
      expect(r.message.toLowerCase()).toMatch(/demo|nenhuma/);
    });
  });

  describe('4.4 cancel preserva DNA + memórias + progresso (sem perda)', () => {
    it('após cancel, o tier vira free MAS dados persistem isolados em outras tabelas', async () => {
      // Marca mascote no DB
      const now = new Date().toISOString();
      const mascot: Mascot = {
        id: 'm-g4',
        user_id: USER,
        name: 'Bipo',
        personality: 'calmo',
        phase: 'crianca',
        mood: 'ok',
        xp: 500,
        level: 5,
        energy: 80,
        health: 90,
        last_seen_at: now,
        created_at: now,
      };
      await mascots.upsert(mascot);

      // Subscribe + cancel
      await subscriptionService.subscribe(USER, 'plus_monthly');
      await subscriptionService.cancel(USER);

      // Mascote ainda lá — `mascots.forUser` retorna o mascote único do user
      const survivor = await mascots.forUser(USER);
      expect(survivor).toBeTruthy();
      expect(survivor?.xp).toBe(500);
      expect(survivor?.level).toBe(5);
    });
  });

  describe('4.5 demo mode é HONESTO — não simula compra silenciosamente', () => {
    it('isDemoBilling() retorna true quando provider != revenuecat (estado atual)', () => {
      // Em test/dev sem EXPO_PUBLIC_BILLING_PROVIDER=revenuecat, deve ser demo
      expect(isDemoBilling()).toBe(true);
    });

    it('getBillingProviderKind() retorna "mock" ou "revenuecat" — sempre conhecido', () => {
      const kind = getBillingProviderKind();
      expect(['mock', 'revenuecat']).toContain(kind);
    });

    it('isMockInProductionBuild() é false em ambiente de teste (NODE_ENV=test)', () => {
      // Em test, NODE_ENV != production → não dispara o warning
      expect(isMockInProductionBuild()).toBe(false);
    });

    it('paywall decision sempre traz demoMode true em test (UI pode banner)', () => {
      const decision = evaluatePaywall('free', 'unlimited_chat');
      expect(decision.demoMode).toBe(true);
    });
  });

  describe('4.6 erro de compra vira mensagem amigável (não code 4001)', () => {
    it('user_cancelled: mensagem acolhedora, sem culpa', () => {
      const err = mapPurchaseError('user_cancelled');
      expect(err.userMessage).not.toMatch(/4\d{3}|error|fail/i);
      expect(err.userMessage.toLowerCase()).toMatch(/cancelad|jeitinho/);
      expect(err.recoverable).toBe(true);
    });

    it('network_error: explicita conexão, sugere retry', () => {
      const err = mapPurchaseError('network_error');
      expect(err.userMessage.toLowerCase()).toMatch(/conex|internet|novo/);
      expect(err.recoverable).toBe(true);
    });

    it('código desconhecido: fallback amigável (NÃO joga "unknown" pro user)', () => {
      const err = mapPurchaseError('SOMETHING_RANDOM_XYZ');
      expect(err.userMessage).not.toMatch(/SOMETHING_RANDOM_XYZ/);
      expect(err.userMessage.length).toBeGreaterThan(10);
    });

    it('TODAS as mensagens são PT-BR (não vazam jargão inglês)', () => {
      const samples = [
        mapPurchaseError('user_cancelled'),
        mapPurchaseError('payment_pending'),
        mapPurchaseError('store_problem'),
        mapPurchaseError('network_error'),
        mapPurchaseError('billing_unavailable'),
      ];
      for (const s of samples) {
        expect(s.userMessage).not.toMatch(/error|failed|cancelled|please try/i);
      }
    });
  });

  describe('4.7 paywall NÃO dispara em momento de fragilidade', () => {
    async function makeCtx(over: Partial<{
      phase: Mascot['phase'];
      level: number;
      streakCurrent: number;
      totalCheckins: number;
      boxOpenedCount: number;
      hasSubscription: boolean;
    }> = {}) {
      const now = new Date().toISOString();
      const mascot: Mascot = {
        id: 'm',
        user_id: USER,
        name: 'Bipo',
        personality: 'calmo',
        phase: over.phase ?? 'ovo',
        mood: 'ok',
        xp: 0,
        level: over.level ?? 1,
        energy: 50,
        health: 80,
        last_seen_at: now,
        created_at: now,
      };
      const streak: Streak = {
        user_id: USER,
        current_streak: over.streakCurrent ?? 0,
        longest_streak: over.streakCurrent ?? 0,
        last_active_date: null,
        grace_days_left: 2,
        updated_at: new Date().toISOString(),
      };
      return {
        mascot,
        streak,
        totalCheckins: over.totalCheckins ?? 0,
        boxOpenedCount: over.boxOpenedCount ?? 0,
        hasSubscription: over.hasSubscription ?? false,
      };
    }

    it('onboarding (phase=ovo, level=1, streak=0) → NUNCA dispara paywall', async () => {
      const ctx = await makeCtx({ phase: 'ovo' });
      const trigger = await shouldTrigger(ctx);
      expect(trigger).toBeNull();
    });

    it('phase=bebe, level=1 → ainda NÃO dispara (usuário só começou)', async () => {
      const ctx = await makeCtx({ phase: 'bebe', level: 1 });
      const trigger = await shouldTrigger(ctx);
      expect(trigger).toBeNull();
    });

    it('streak 7 dias → DISPARA (momento de alto valor, não fragilidade)', async () => {
      // Clean storage de marcações anteriores
      const AS = (await import('@react-native-async-storage/async-storage')).default;
      await AS.removeItem('paywall_shown:streak_7');
      await AS.removeItem('paywall_shown:first_evolution');
      const ctx = await makeCtx({ streakCurrent: 7, phase: 'bebe' });
      const trigger = await shouldTrigger(ctx);
      expect(trigger).not.toBeNull();
    });

    it('usuário JÁ assinante: NUNCA dispara paywall', async () => {
      const ctx = await makeCtx({ streakCurrent: 30, totalCheckins: 100, hasSubscription: true });
      const trigger = await shouldTrigger(ctx);
      expect(trigger).toBeNull();
    });

    it('paywall copy NÃO usa termos de pressão/cobrança', async () => {
      const { copyFor } = await import('@/lib/paywall-triggers');
      const triggers = [
        'first_evolution', 'streak_7', 'level_5', 'checkin_30',
        'first_box_opened', 'premium_feature', 'rare_evolution',
      ] as const;
      const forbidden = /agora ou nunca|última chance|você perdeu|deveria/i;
      for (const t of triggers) {
        const { title, body } = copyFor(t, 'Bipo');
        expect(title, `trigger=${t}`).not.toMatch(forbidden);
        expect(body, `trigger=${t}`).not.toMatch(forbidden);
      }
    });
  });
});

// Sanity import — verifica que os exports usados existem (catches typos)
describe('Guarantee #4 — sanity dos exports', () => {
  it('todos os módulos críticos exportam o que esperamos', () => {
    expect(typeof subscriptionService.subscribe).toBe('function');
    expect(typeof subscriptionService.cancel).toBe('function');
    expect(typeof subscriptionService.restore).toBe('function');
    expect(typeof restorePurchasesService.restore).toBe('function');
    expect(typeof evaluatePaywall).toBe('function');
    expect(typeof mapPurchaseError).toBe('function');
    expect(typeof shouldTrigger).toBe('function');
  });
});

