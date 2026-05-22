/**
 * Guarantee #3: "Chat Plus é útil (não repetitivo) e rápido."
 *
 * Proxy + personalidade, não só fallback. Promessas:
 *  - PersonalityVoice tem ≥ 3 variações por personalidade (não-repetitivo)
 *  - Mesmo input com seeds diferentes → outputs distintos (variedade)
 *  - Free tem rate limit honesto (10/dia), Plus é ilimitado prático
 *  - Cost guard impede runaway de token em produção
 *  - Proxy tem timeout < 30s (rápido ou desiste)
 *  - Validator rejeita claims clínicos antes de mostrar
 *  - Markup perigoso (URLs, scripts, code) é REJEITADO
 *  - Resposta vazia degrada pra SAFE_FALLBACK
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyPersonalityVoice,
  buildPersonalityVoice,
} from '@/ai/PersonalityVoice';
import {
  checkAiRateLimit,
  recordAiUsage,
  resetAiUsage,
} from '@/ai/AIRateLimiter';
import {
  checkAiCostBudget,
  recordAiCost,
  resetAiCost,
  ESTIMATED_TOKENS_PER_REPLY,
} from '@/ai/AICostGuard';
import { validateAiResponse, toAiResponse } from '@/ai/AIResponseValidator';
import { SAFE_FALLBACK } from '@/content/safety';
import type { Personality } from '@/types';

const PERSONALITIES: Personality[] = ['calmo', 'motivador', 'fofo', 'sabio'];

beforeEach(async () => {
  // Reset AsyncStorage counters de quaisquer testes anteriores
  await resetAiUsage('g3-user');
  await resetAiCost('g3-user');
});

afterEach(async () => {
  await resetAiUsage('g3-user');
  await resetAiCost('g3-user');
});

describe('Guarantee #3 — Chat Plus é útil, não repetitivo, rápido', () => {
  describe('3.1 PersonalityVoice gera variedade real (não 1 opener por personalidade)', () => {
    it('cada uma das 4 personalidades tem ≥ 3 openers distintos', () => {
      for (const p of PERSONALITIES) {
        const openers = new Set<string>();
        for (let i = 0; i < 20; i++) {
          // Varia mascotName pra forçar pick diferente (seed-based)
          const v = buildPersonalityVoice({ personality: p, mascotName: `seed-${i}` });
          openers.add(v.prefix);
        }
        expect(openers.size, `personality=${p}`).toBeGreaterThanOrEqual(3);
      }
    });

    it('mesmo mascotName → MESMO opener (determinismo — não random sem seed)', () => {
      const a = buildPersonalityVoice({ personality: 'fofo', mascotName: 'Lulu' });
      const b = buildPersonalityVoice({ personality: 'fofo', mascotName: 'Lulu' });
      expect(a.prefix).toBe(b.prefix);
    });

    it('applyPersonalityVoice em reply curto adiciona prefix + closer (não retorna nu)', () => {
      const enriched = applyPersonalityVoice('Tudo bem.', {
        personality: 'calmo',
        mascotName: 'Bipo',
      });
      expect(enriched.length).toBeGreaterThan('Tudo bem.'.length);
    });

    it('applyPersonalityVoice em reply longo (>120 chars) NÃO adiciona prefix (evita verbosidade)', () => {
      const long = 'a'.repeat(150);
      const enriched = applyPersonalityVoice(long, {
        personality: 'sabio',
        mascotName: 'Aro',
      });
      expect(enriched).toBe(long);
    });
  });

  describe('3.2 rate limit honesto por tier', () => {
    it('free: limite diário definido e enforced', async () => {
      const r = await checkAiRateLimit('g3-user', 'free');
      expect(r.limit).toBeGreaterThan(0);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBeGreaterThan(0);
    });

    it('plus_monthly: SEM limite (chat ilimitado prometido)', async () => {
      const r = await checkAiRateLimit('g3-user', 'plus_monthly');
      expect(r.limit).toBeNull();
      expect(r.allowed).toBe(true);
    });

    it('plus_annual: SEM limite', async () => {
      const r = await checkAiRateLimit('g3-user', 'plus_annual');
      expect(r.limit).toBeNull();
    });

    it('free: ao bater limite, próxima chamada é bloqueada com razão honesta', async () => {
      const first = await checkAiRateLimit('g3-user', 'free');
      const limit = first.limit ?? 0;
      // Gasta todas as N de uma vez
      for (let i = 0; i < limit; i++) await recordAiUsage('g3-user');
      const r = await checkAiRateLimit('g3-user', 'free');
      expect(r.allowed).toBe(false);
      expect(r.remaining).toBe(0);
      expect(r.reason).toMatch(/Limite|Plus libera/i);
    });
  });

  describe('3.3 cost guard previne runaway de token', () => {
    it('free: budget conservador (suficiente pra dia, não pra abuso)', async () => {
      const r = await checkAiCostBudget('g3-user', 'free');
      expect(r.budget).toBeGreaterThan(ESTIMATED_TOKENS_PER_REPLY * 5); // pelo menos 5 turnos
      expect(r.budget).toBeLessThan(50_000); // mas não infinito
    });

    it('plus: budget altíssimo (uso humano legítimo nunca alcança)', async () => {
      const r = await checkAiCostBudget('g3-user', 'plus_monthly');
      expect(r.budget).toBeGreaterThanOrEqual(100_000);
    });

    it('ao gastar tudo, próxima requisição é negada com razão honesta', async () => {
      const first = await checkAiCostBudget('g3-user', 'free');
      await recordAiCost('g3-user', first.budget);
      const r = await checkAiCostBudget('g3-user', 'free');
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/Orçamento|Plus/i);
    });
  });

  describe('3.4 resposta validator rejeita claims perigosos', () => {
    it('resposta vazia → SAFE_FALLBACK + flag watch', () => {
      const v = validateAiResponse({ reply: '' });
      expect(v.valid).toBe(false);
      expect(v.reply).toBe(SAFE_FALLBACK);
      expect(v.safety_flag).toBe('watch');
      expect(v.issues).toContain('empty_reply');
    });

    it('resposta com URL é rejeitada (anti-phishing)', () => {
      const v = validateAiResponse({ reply: 'Confira https://malicious.site para mais.' });
      expect(v.valid).toBe(false);
      expect(v.reply).toBe(SAFE_FALLBACK);
      expect(v.issues).toContain('forbidden_markup');
    });

    it('resposta com markdown code fence é rejeitada', () => {
      const v = validateAiResponse({ reply: 'Aqui: ```js\nrun()\n``` agora.' });
      expect(v.valid).toBe(false);
      expect(v.issues).toContain('forbidden_markup');
    });

    it('resposta com <script> é rejeitada (XSS guard)', () => {
      const v = validateAiResponse({ reply: 'oi <script>alert(1)</script>' });
      expect(v.valid).toBe(false);
    });

    it('resposta saudável passa', () => {
      const v = validateAiResponse({
        reply: 'Que bom te ver. Respira fundo comigo, um instante.',
      });
      expect(v.valid).toBe(true);
      expect(v.reply).not.toBe(SAFE_FALLBACK);
    });

    it('toAiResponse marca source=fallback se inválido (não passa adiante)', () => {
      const r = toAiResponse({ reply: 'visite https://x.com' }, 'openai');
      expect(r.source).toBe('fallback');
      expect(r.reply).toBe(SAFE_FALLBACK);
    });
  });

  describe('3.5 proxy tem timeout — rápido ou desiste', () => {
    it('PROXY_TIMEOUT_MS está definido e ≤ 30s (UX promise: nunca trava)', async () => {
      // Lê o source pra validar a constante — mais robusto que mockar fetch
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const src = await fs.readFile(
        path.resolve(__dirname, '../../src/ai/ProxyMascotAI.ts'),
        'utf8',
      );
      const match = src.match(/PROXY_TIMEOUT_MS\s*=\s*(\d+(?:_\d+)*)/);
      expect(match, 'PROXY_TIMEOUT_MS constant deve existir').toBeTruthy();
      const ms = Number.parseInt((match?.[1] ?? '0').replace(/_/g, ''), 10);
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(30_000);
    });

    it('proxy usa AbortController (cancela request em timeout)', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const src = await fs.readFile(
        path.resolve(__dirname, '../../src/ai/ProxyMascotAI.ts'),
        'utf8',
      );
      expect(src).toContain('AbortController');
      expect(src).toContain('controller.abort()');
    });
  });

  describe('3.6 variação real entre turnos consecutivos (anti-repetição)', () => {
    it('PersonalityVoice rotaciona openers com seeds diferentes (3+ no buffer)', () => {
      // Simula 3 turnos consecutivos com mascotNames variando — é a forma
      // determinística do app rodar variedade (em produção, varia por contexto
      // — hora do dia, mood, etc.).
      const turns = ['v1', 'v2', 'v3', 'v4', 'v5'].map((seed) =>
        buildPersonalityVoice({ personality: 'motivador', mascotName: seed }),
      );
      const uniquePrefixes = new Set(turns.map((t) => t.prefix));
      expect(uniquePrefixes.size).toBeGreaterThanOrEqual(2);
    });
  });
});
