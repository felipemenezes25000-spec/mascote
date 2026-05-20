/**
 * Testes do validador de ambiente — fail-fast em prod mal-configurado.
 *
 * Foco crítico: build de produção NÃO pode rodar com billing=mock nem com
 * EXPO_PUBLIC_OPENAI_API_KEY definido. Em dev, qualquer config passa.
 *
 * process.env é manipulado por teste — beforeEach restaura snapshot pra
 * evitar contaminação cruzada com outros suites que rodam em paralelo.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertProductionConfig, getProductionViolations, getRuntimeConfig } from '@/lib/env/runtime-config';

const ENV_KEYS = [
  'EXPO_PUBLIC_ENV',
  'NODE_ENV',
  'EXPO_PUBLIC_BILLING_PROVIDER',
  'EXPO_PUBLIC_OPENAI_API_KEY',
  'EXPO_PUBLIC_AI_PROXY_URL',
  'EXPO_PUBLIC_REVENUECAT_API_KEY',
  'EXPO_PUBLIC_REVENUECAT_API_KEY_IOS',
  'EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID',
  'EXPO_PUBLIC_RC_ENABLED',
] as const;

let snapshot: Record<string, string | undefined> = {};

beforeEach(() => {
  snapshot = {};
  for (const k of ENV_KEYS) {
    snapshot[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (snapshot[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = snapshot[k];
    }
  }
});

describe('getRuntimeConfig', () => {
  it('default é development com billing mock (sem env)', () => {
    const cfg = getRuntimeConfig();
    expect(cfg.env).toBe('development');
    expect(cfg.isDevelopment).toBe(true);
    expect(cfg.isProduction).toBe(false);
    expect(cfg.billing.provider).toBe('mock');
    expect(cfg.hasPublicOpenAIKey).toBe(false);
  });

  it('reconhece EXPO_PUBLIC_ENV=production', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    const cfg = getRuntimeConfig();
    expect(cfg.env).toBe('production');
    expect(cfg.isProduction).toBe(true);
  });

  it('reconhece EXPO_PUBLIC_OPENAI_API_KEY com valor', () => {
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-test123';
    const cfg = getRuntimeConfig();
    expect(cfg.hasPublicOpenAIKey).toBe(true);
  });

  it('string vazia NÃO conta como key definida', () => {
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = '   ';
    const cfg = getRuntimeConfig();
    expect(cfg.hasPublicOpenAIKey).toBe(false);
  });

  it('aiProxyUrl é null quando não definido', () => {
    const cfg = getRuntimeConfig();
    expect(cfg.aiProxyUrl).toBeNull();
  });
});

describe('getProductionViolations', () => {
  it('retorna [] em ambiente development', () => {
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    expect(getProductionViolations()).toEqual([]);
  });

  it('em produção + mock billing: violação mock_billing_in_production', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    const v = getProductionViolations();
    expect(v).toHaveLength(1);
    expect(v[0].code).toBe('mock_billing_in_production');
    expect(v[0].fix).toMatch(/revenuecat/i);
  });

  it('em produção + EXPO_PUBLIC_OPENAI_API_KEY: violação public_openai_key', () => {
    // Combinar com billing real pra isolar a violação de chave OpenAI.
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'revenuecat';
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = 'appl_anything';
    process.env.EXPO_PUBLIC_RC_ENABLED = 'true';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-leaked';
    const v = getProductionViolations();
    const codes = v.map(x => x.code);
    expect(codes).toContain('public_openai_key_in_production');
  });

  it('múltiplas violações ao mesmo tempo', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-leaked';
    const v = getProductionViolations();
    expect(v.length).toBeGreaterThanOrEqual(2);
  });
});

describe('assertProductionConfig', () => {
  it('NÃO lança em dev', () => {
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    expect(() => assertProductionConfig()).not.toThrow();
  });

  it('lança em produção mal-configurada', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    expect(() => assertProductionConfig()).toThrow(/assertProductionConfig/);
  });

  it('mensagem do erro inclui código da violação e dica de fix', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-leaked';
    try {
      assertProductionConfig();
      expect.fail('deveria ter lançado');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).toMatch(/public_openai_key_in_production/);
      expect(msg).toMatch(/proxy|EXPO_PUBLIC_OPENAI_API_KEY/);
    }
  });
});
