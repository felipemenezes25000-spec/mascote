/**
 * Grid exaustivo de combinações env × billing × keys do runtime-config.
 *
 * Cada linha em CASES é UM cenário esperado, com inputs e os codes de
 * violação esperados na saída. Cobre a matriz completa de configurações
 * que beta/QA podem montar erradas.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assertProductionConfig,
  getProductionViolations,
  getRuntimeConfig,
} from '@/lib/env/runtime-config';

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
    if (snapshot[k] === undefined) delete process.env[k];
    else process.env[k] = snapshot[k];
  }
});

const VALID_ENVS = ['development', 'production', 'staging', 'test'];
const PROVIDER_VALUES = ['mock', 'revenuecat', undefined];

describe('getRuntimeConfig — reconhecimento de ENV', () => {
  it.each(VALID_ENVS)('EXPO_PUBLIC_ENV=%s é reconhecido', env => {
    process.env.EXPO_PUBLIC_ENV = env;
    expect(getRuntimeConfig().env).toBe(env);
  });

  it.each(['Production', 'PROD', 'prod'])('case-insensitive: %s → production', env => {
    process.env.EXPO_PUBLIC_ENV = env;
    expect(getRuntimeConfig().env).toBe('production');
  });

  it.each(['Staging', 'STAGE', 'stage'])('case-insensitive: %s → staging', env => {
    process.env.EXPO_PUBLIC_ENV = env;
    expect(getRuntimeConfig().env).toBe('staging');
  });

  it.each(['Test', 'TESTING', 'testing'])('case-insensitive: %s → test', env => {
    process.env.EXPO_PUBLIC_ENV = env;
    expect(getRuntimeConfig().env).toBe('test');
  });

  it.each(['', '   ', 'random-garbage', 'develop', 'dev'])(
    'valor inválido (%s) cai pra development',
    env => {
      process.env.EXPO_PUBLIC_ENV = env;
      expect(getRuntimeConfig().env).toBe('development');
    },
  );

  it('fallback para NODE_ENV se EXPO_PUBLIC_ENV não definido', () => {
    process.env.NODE_ENV = 'production';
    expect(getRuntimeConfig().env).toBe('production');
  });
});

describe('hasPublicOpenAIKey — sanitização', () => {
  const KEY_CASES: Array<[string | undefined, boolean]> = [
    [undefined, false],
    ['', false],
    [' ', false],
    ['   ', false],
    ['\t\n', false],
    ['sk-leaked', true],
    ['sk-test123', true],
    ['a', true],
  ];
  it.each(KEY_CASES)('key=%j → hasPublicOpenAIKey=%s', (key, expected) => {
    if (key === undefined) delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    else process.env.EXPO_PUBLIC_OPENAI_API_KEY = key;
    expect(getRuntimeConfig().hasPublicOpenAIKey).toBe(expected);
  });
});

describe('aiProxyUrl — sanitização', () => {
  it.each([undefined, '', '   '])('valor vazio (%j) → null', val => {
    if (val === undefined) delete process.env.EXPO_PUBLIC_AI_PROXY_URL;
    else process.env.EXPO_PUBLIC_AI_PROXY_URL = val;
    expect(getRuntimeConfig().aiProxyUrl).toBeNull();
  });

  it.each([
    'https://api.example.com',
    'http://localhost:3000',
    'https://my-proxy.dev/v1',
  ])('valor não-vazio (%s) é preservado', val => {
    process.env.EXPO_PUBLIC_AI_PROXY_URL = val;
    expect(getRuntimeConfig().aiProxyUrl).toBe(val);
  });
});

describe('getProductionViolations — não-prod sempre vazio', () => {
  it.each(['development', 'staging', 'test'])('env=%s — sempre 0 violações mesmo com mock+key', env => {
    process.env.EXPO_PUBLIC_ENV = env;
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-leaked';
    expect(getProductionViolations()).toHaveLength(0);
  });
});

describe('getProductionViolations — produção com mock', () => {
  it('mock + production → violation mock_billing_in_production', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    const v = getProductionViolations();
    expect(v.some(x => x.code === 'mock_billing_in_production')).toBe(true);
  });

  it('mensagem inclui "Usuários não serão cobrados de verdade"', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    const v = getProductionViolations();
    const issue = v.find(x => x.code === 'mock_billing_in_production');
    expect(issue?.message).toMatch(/cobrados/i);
  });

  it('fix sugere revenuecat', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    const v = getProductionViolations();
    expect(v[0].fix).toMatch(/revenuecat/i);
  });
});

describe('getProductionViolations — chave OpenAI pública em prod', () => {
  it('key + production + revenuecat-ready → violation public_openai_key', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'revenuecat';
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = 'appl_xxx';
    process.env.EXPO_PUBLIC_RC_ENABLED = 'true';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-leaked';
    const v = getProductionViolations();
    expect(v.some(x => x.code === 'public_openai_key_in_production')).toBe(true);
  });

  it('mensagem menciona "literais no bundle"', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'revenuecat';
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = 'appl_xxx';
    process.env.EXPO_PUBLIC_RC_ENABLED = 'true';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-leaked';
    const v = getProductionViolations();
    const issue = v.find(x => x.code === 'public_openai_key_in_production');
    expect(issue?.message).toMatch(/literais no bundle/i);
  });

  it('fix sugere proxy', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'revenuecat';
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = 'appl_xxx';
    process.env.EXPO_PUBLIC_RC_ENABLED = 'true';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-leaked';
    const v = getProductionViolations();
    const issue = v.find(x => x.code === 'public_openai_key_in_production');
    expect(issue?.fix).toMatch(/proxy|EXPO_PUBLIC_AI_PROXY_URL|secure-store/i);
  });
});

describe('getProductionViolations — múltiplas violações simultâneas', () => {
  it('mock + key → 2 violações distintas', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-leaked';
    const v = getProductionViolations();
    expect(v.length).toBeGreaterThanOrEqual(2);
    const codes = v.map(x => x.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('assertProductionConfig — comportamento', () => {
  it.each(['development', 'staging', 'test'])('env=%s — NUNCA lança', env => {
    process.env.EXPO_PUBLIC_ENV = env;
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-leaked';
    expect(() => assertProductionConfig()).not.toThrow();
  });

  it('production válido (revenuecat ready, sem key) NÃO lança', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'revenuecat';
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = 'appl_xxx';
    process.env.EXPO_PUBLIC_RC_ENABLED = 'true';
    expect(() => assertProductionConfig()).not.toThrow();
  });

  it('production mal-configurado lança Error', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_BILLING_PROVIDER = 'mock';
    expect(() => assertProductionConfig()).toThrow(Error);
  });
});

describe('RuntimeConfig — flags booleanas coerentes', () => {
  it('isDevelopment XOR isProduction XOR isStaging XOR isTest (1 de 4)', () => {
    for (const env of VALID_ENVS) {
      process.env.EXPO_PUBLIC_ENV = env;
      const cfg = getRuntimeConfig();
      const count = [cfg.isProduction, cfg.isDevelopment, cfg.isStaging, cfg.isTest].filter(Boolean).length;
      expect(count).toBe(1);
    }
  });
});
