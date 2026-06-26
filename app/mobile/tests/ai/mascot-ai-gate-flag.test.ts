/**
 * Regressão (auditoria 2026-06-26 ajuste1): quando o rate-limit ou o cost-budget
 * estouram, mascotReply retornava o fallback com safety_flag hardcoded 'safe',
 * rebaixando um 'watch' detectado no input (ex.: "fiz terapia hoje"). A UI perdia
 * o disclaimer/banner. O ramo catch já preservava a flag; estes ramos não.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const rateAllowed = { value: true };

vi.mock('@/ai/AIRateLimiter', () => ({
  checkAiRateLimit: vi.fn(async () => ({
    allowed: rateAllowed.value,
    reason: 'Limite diário atingido.',
  })),
  recordAiUsage: vi.fn(async () => {}),
}));

import { mascotReply } from '@/ai/MascotAI';

describe('mascotReply — flag preservada quando o gate nega', () => {
  beforeEach(() => {
    rateAllowed.value = true;
  });

  it('rate-limit estourado preserva watch do input (não rebaixa pra safe)', async () => {
    rateAllowed.value = false;
    const r = await mascotReply('fofo', 'fiz terapia hoje', { userId: 'u-gate-watch' });
    expect(r.source).toBe('fallback');
    expect(/Limite/i.test(r.reply)).toBe(true);
    expect(r.safety_flag).toBe('watch');
  });

  it('rate-limit estourado mantém safe quando o input é neutro', async () => {
    rateAllowed.value = false;
    const r = await mascotReply('fofo', 'oi tudo bem', { userId: 'u-gate-safe' });
    expect(r.source).toBe('fallback');
    expect(r.safety_flag).toBe('safe');
  });
});
