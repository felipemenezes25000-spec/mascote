/**
 * Testes dos guards de produção de IA.
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
import { applyPersonalityVoice } from '@/ai/PersonalityVoice';

const UID = 'test-ai-guards';

describe('AIRateLimiter', () => {
  beforeEach(async () => {
    await resetAiUsage(UID);
  });

  it('free tem limite 10/dia', async () => {
    const first = await checkAiRateLimit(UID, 'free');
    expect(first.allowed).toBe(true);
    expect(first.limit).toBe(10);
  });

  it('bloqueia após 10 usos no free', async () => {
    for (let i = 0; i < 10; i++) await recordAiUsage(UID);
    const blocked = await checkAiRateLimit(UID, 'free');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('plus não tem limite', async () => {
    const r = await checkAiRateLimit(UID, 'plus_monthly');
    expect(r.allowed).toBe(true);
    expect(r.limit).toBeNull();
  });
});

describe('AICostGuard', () => {
  beforeEach(async () => {
    await resetAiCost(UID);
  });

  it('free budget 2000 tokens', async () => {
    const r = await checkAiCostBudget(UID, 'free');
    expect(r.allowed).toBe(true);
    expect(r.budget).toBe(2000);
  });

  it('bloqueia quando budget esgotado', async () => {
    await recordAiCost(UID, 2000);
    const r = await checkAiCostBudget(UID, 'free', ESTIMATED_TOKENS_PER_REPLY);
    expect(r.allowed).toBe(false);
  });
});

describe('AIResponseValidator', () => {
  it('rejeita resposta vazia', () => {
    const v = validateAiResponse({ reply: '' });
    expect(v.valid).toBe(false);
    expect(v.issues).toContain('empty_reply');
  });

  it('rejeita markdown/links', () => {
    const v = validateAiResponse({ reply: 'Veja https://evil.com' });
    expect(v.valid).toBe(false);
  });

  it('toAiResponse marca fallback em conteúdo inválido', () => {
    const r = toAiResponse({ reply: '```code```' }, 'openai');
    expect(r.source).toBe('fallback');
  });
});

describe('PersonalityVoice', () => {
  it('enriquece resposta curta', () => {
    const out = applyPersonalityVoice('Beba água.', {
      personality: 'fofo',
      mascotName: 'Bibo',
    });
    expect(out.length).toBeGreaterThan('Beba água.'.length);
  });
});
