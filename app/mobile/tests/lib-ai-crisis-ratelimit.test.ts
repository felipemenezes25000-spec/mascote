import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Força o gate de rate-limit a NEGAR — assim exercitamos o caminho do gate em
// generateReply (que só roda com userId E sem skipGuards, como chama o chat.tsx).
vi.mock('@/ai/AIRateLimiter', () => ({
  checkAiRateLimit: vi.fn(async () => ({ allowed: false, reason: 'Limite diário atingido.' })),
  recordAiUsage: vi.fn(async () => {}),
}));
vi.mock('@/ai/AICostGuard', () => ({
  checkAiCostBudget: vi.fn(async () => ({ allowed: true })),
  recordAiCost: vi.fn(async () => {}),
}));

import { generateReply } from '@/lib/ai';

/**
 * Regressão (auditoria backend 2026-06-27 ajuste1): CRISE NUNCA É RATE-LIMITADA.
 *
 * Bug: o gate de rate/cost em generateReply rodava ANTES da classificação de
 * safety (que só acontecia em generateReplyInternal). Um user que estourou o
 * limite diário e então digitava uma mensagem de crise recebia "Limite atingido"
 * com flag 'safe' — sem CRISIS_REPLY, sem CVV 188, e o banner de CVV (que dispara
 * em safety_flag === 'critical') não aparecia. chat.tsx chama generateReply
 * DIRETO (com userId, sem skipGuards), então o gate era o caminho de produção.
 */
describe('lib/ai - crise bypassa rate-limit (gate path)', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it.each([
    'vou me matar',
    'quero me matar agora',
    'preferia morrer',
    'perdi a esperança de viver',
  ])('crítico "%s" → CRISIS_REPLY mesmo rate-limitado', async (msg) => {
    const r = await generateReply('calmo', msg, { userId: 'u_rl_test' });
    expect(r.safety_flag).toBe('critical');
    expect(r.reply).toContain('188');
  });

  it('high (pânico) → CRISIS_REPLY mesmo rate-limitado', async () => {
    const r = await generateReply('calmo', 'estou em pânico total', { userId: 'u_rl_test' });
    expect(r.safety_flag).toBe('critical');
    expect(r.reply).toContain('188');
  });

  it('watch rate-limitado preserva flag (não rebaixa pra safe)', async () => {
    // Mensagem clínica 'watch' que estourou o limite: recebe a msg de limite,
    // mas o flag 'watch' é preservado pra UI não perder o disclaimer.
    const r = await generateReply('calmo', 'tenho depressão', { userId: 'u_rl_test' });
    expect(r.safety_flag).toBe('watch');
    expect(r.reply).toMatch(/Limite/i);
  });

  it('safe rate-limitado → msg de limite com flag safe', async () => {
    const r = await generateReply('calmo', 'bebi água hoje', { userId: 'u_rl_test' });
    expect(r.safety_flag).toBe('safe');
    expect(r.reply).toMatch(/Limite/i);
  });
});
