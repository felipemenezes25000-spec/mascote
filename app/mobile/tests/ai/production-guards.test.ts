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

  it('preserva source openai em resposta longa-mas-segura (fix audit 2026-05-27)', () => {
    // OpenAI às vezes excede 35 palavras / 280 chars em resposta legítima.
    // Antes: caía pra source='fallback' e UI badge mentia "modo local".
    // Agora: valid=true (sem flag de segurança), clean=false (warning de tamanho).
    const longReply = 'Que bom te ouvir hoje, de verdade mesmo. Respira fundo comigo agora, bem devagarinho — ' +
      'sente o ar entrando e saindo, sem pressa nenhuma. Eu fico aqui contigo até você sentir um pouquinho ' +
      'mais de leveza, sem cobrança, sem pressa, tá bom mesmo assim? A gente vai juntos no seu ritmo.';
    expect(longReply.length).toBeGreaterThan(280); // garante que excede ceiling soft
    const v = validateAiResponse({ reply: longReply });
    expect(v.valid).toBe(true); // não é falha de segurança
    expect(v.clean).toBe(false); // mas excede ceiling soft
    expect(v.reply).toBe(longReply); // texto original preservado
    expect(v.issues).toContain('soft_too_long_chars');
  });

  it('toAiResponse mantém source openai em resposta longa (fix audit 2026-05-27)', () => {
    const longReply = 'Que bom te ouvir hoje, de verdade mesmo. Respira fundo comigo agora, bem devagarinho — ' +
      'sente o ar entrando e saindo, sem pressa nenhuma. Eu fico aqui contigo até você sentir um pouquinho ' +
      'mais de leveza, sem cobrança, sem pressa, tá bom mesmo assim? A gente vai juntos no seu ritmo.';
    const r = toAiResponse({ reply: longReply }, 'openai');
    expect(r.source).toBe('openai'); // badge "IA conectada" continua honesto
    expect(r.reply).toBe(longReply);
  });

  it('hard-trunca resposta absurdamente longa preservando openai source', () => {
    // Modelo descalibrado entregando 1000+ chars: trunca pra ~600 com ellipsis
    // em vez de cair pra SAFE_FALLBACK silencioso (que era o bug original).
    const monster = 'palavra '.repeat(150); // ~1200 chars
    const v = validateAiResponse({ reply: monster });
    expect(v.valid).toBe(true);
    expect(v.reply.length).toBeLessThanOrEqual(600);
    expect(v.reply.endsWith('…')).toBe(true);
    expect(v.issues).toContain('hard_truncated');
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
