/**
 * Coverage test — garante que toda (personality, intent) combinação tem
 * templates suficientes no banco. Roda como guard contra regressão de
 * conteúdo (esqueceram de adicionar uma intent nova numa personalidade).
 *
 * Threshold por intent class:
 * - Legacy intents (v1 antes da auditoria 2026-05-27): ≥ 3 templates.
 *   Banks como acolhe_solidao tinham 3 entradas no inicio, e elevar todos
 *   pra 5 sem necessidade explode escopo. Threshold reflete o piso real.
 * - Intents v2 (pergunta_estrategia, pergunta_reflexiva): ≥ 5 templates.
 *   Conforme plano TIER 2.3 — escopo do prompt explicito sobre 5 por
 *   personalidade.
 * - Intents v2.1 (compartilha_vitoria, pede_companhia, expressa_solidao,
 *   compartilha_descoberta): ≥ 10 templates. Plano TIER 3.3 pede 10.
 *
 * Adaptação ao codebase: o objeto `banks` interno em replies.ts não é
 * exportado. Acessamos a contagem via samples + Set — pickNonRepeat reduz
 * repetição mas não impede; com 30 amostras + reset entre cada, esperamos
 * coletar pelo menos N strings distintas onde N == tamanho real do bank.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { classifyIntent, mockReply, INTENTS, PERSONALITIES, __resetReplyCache } from '@/content/replies';
import type { Intent } from '@/content/replies';

const V2_INTENTS = new Set<Intent>(['pergunta_estrategia', 'pergunta_reflexiva']);
const V2_1_INTENTS = new Set<Intent>([
  'compartilha_vitoria',
  'pede_companhia',
  'expressa_solidao',
  'compartilha_descoberta',
]);

function thresholdFor(intent: Intent): number {
  if (V2_1_INTENTS.has(intent)) return 10;
  if (V2_INTENTS.has(intent)) return 5;
  return 3;
}

function countDistinctSamples(personality: 'calmo' | 'motivador' | 'fofo' | 'sabio', intent: Intent, n = 300): number {
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    __resetReplyCache();
    seen.add(mockReply(personality, intent));
  }
  return seen.size;
}

describe('reply coverage', () => {
  beforeEach(() => {
    __resetReplyCache();
  });

  it.each(PERSONALITIES)('personality %s has enough templates for every intent', (p) => {
    for (const intent of INTENTS) {
      const want = thresholdFor(intent);
      const got = countDistinctSamples(p, intent);
      expect({ personality: p, intent, count: got, expected: `>=${want}` }).toMatchObject({
        personality: p,
        intent,
        count: expect.any(Number),
      });
      expect(got).toBeGreaterThanOrEqual(want);
    }
  });

  it('classifyIntent recognizes new strategic question patterns', () => {
    expect(classifyIntent('como vou superar a ansiedade?')).toBe('pergunta_estrategia');
    expect(classifyIntent('Como faço pra dormir melhor?')).toBe('pergunta_estrategia');
    expect(classifyIntent('como melhoro disso')).toBe('pergunta_estrategia');
  });

  it('classifyIntent recognizes reflexive question patterns', () => {
    expect(classifyIntent('por que sinto isso sempre?')).toBe('pergunta_reflexiva');
    expect(classifyIntent('será que sou eu mesmo?')).toBe('pergunta_reflexiva');
    expect(classifyIntent('o que significa esse vazio?')).toBe('pergunta_reflexiva');
  });

  it('classifyIntent recognizes narrative intents (v2.1)', () => {
    expect(classifyIntent('consegui terminar o projeto!')).toBe('compartilha_vitoria');
    expect(classifyIntent('só quero conversar agora')).toBe('pede_companhia');
    expect(classifyIntent('me sinto sozinho hoje')).toBe('expressa_solidao');
    expect(classifyIntent('descobri uma coisa em mim')).toBe('compartilha_descoberta');
  });

  it('all intents in INTENTS export are recognized by intentMap (via mockReply)', () => {
    // Smoke: mockReply NÃO pode lançar pra nenhum intent declarado em INTENTS.
    for (const p of PERSONALITIES) {
      for (const intent of INTENTS) {
        expect(() => mockReply(p, intent)).not.toThrow();
        expect(mockReply(p, intent).length).toBeGreaterThan(0);
      }
    }
  });
});
