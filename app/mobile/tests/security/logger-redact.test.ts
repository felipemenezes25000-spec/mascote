/**
 * PENTEST — Sanitização programática do logger.
 *
 * Garante que `redactSecrets()` e os métodos `logger.dev/warn/error`
 * removem segredos automaticamente antes de console/sink. Defesa em
 * profundidade contra os 28 callsites que possam acidentalmente passar
 * Error/Request/headers crus.
 *
 * Cenários cobertos:
 *  - strings com sk-..., sk-proj-..., sk-ant-..., Bearer ..., Authorization=...
 *  - objetos com chaves sensíveis (token, password, api_key, etc — case-insensitive)
 *  - arrays e nested objects
 *  - Error.message e Error.stack
 *  - primitivos (number, boolean, null, undefined, bigint)
 *  - depth cutoff em grafos profundos (sem crash)
 *  - integração com logger.dev/warn/error e sink
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger, redactSecrets, setLogSink, type LogSink } from '@/lib/logger';

interface CapturedLog {
  level: 'dev' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
}

function makeSink(): { sink: LogSink; captured: CapturedLog[] } {
  const captured: CapturedLog[] = [];
  const sink: LogSink = {
    capture(level, message, context) {
      captured.push({ level, message, context });
    },
  };
  return { sink, captured };
}

beforeEach(() => {
  setLogSink(null);
  // Silencia console pra não poluir output do test runner (e pra detectar
  // se a redação chega lá; spies abaixo capturam quando necessário).
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  setLogSink(null);
  vi.restoreAllMocks();
});

describe('redactSecrets — strings', () => {
  it('mascara sk-... estilo OpenAI', () => {
    expect(redactSecrets('use sk-abcdef1234567890ABCD here')).toBe(
      'use sk-[REDACTED] here'
    );
  });

  it('mascara sk-proj-... estilo OpenAI project key', () => {
    const k = 'sk-proj-aBcDeFgHiJkLmNoPqRsT12345';
    const out = redactSecrets(`key=${k}`) as string;
    expect(out).not.toContain(k);
    expect(out).toContain('sk-[REDACTED]');
  });

  it('mascara sk-ant-... estilo Anthropic', () => {
    const k = 'sk-ant-api03-aBcDeFgHiJkLmNoPqRsT12345';
    const out = redactSecrets(k) as string;
    expect(out).not.toContain(k);
    expect(out).toBe('sk-[REDACTED]');
  });

  it('mascara Bearer token', () => {
    expect(redactSecrets('Authorization header Bearer abc123.def456.ghi789')).toMatch(
      /Bearer \[REDACTED\]/
    );
  });

  it('mascara Authorization: <value> em string JSON-like', () => {
    const out = redactSecrets('Request {Authorization: xyz-secret-1234}') as string;
    expect(out).not.toContain('xyz-secret-1234');
    expect(out).toMatch(/Authorization:?\s*\[REDACTED\]/i);
  });

  it('mascara Stripe-like keys (sk_live_, pk_test_, whsec_)', () => {
    const out1 = redactSecrets('sk_live_abcdef1234567890ABCD') as string;
    const out2 = redactSecrets('pk_test_abcdef1234567890ABCD') as string;
    const out3 = redactSecrets('whsec_test_abcdef1234567890ABCD') as string;
    expect(out1).toBe('[REDACTED_KEY]');
    expect(out2).toBe('[REDACTED_KEY]');
    expect(out3).toBe('[REDACTED_KEY]');
  });

  it('não toca strings sem segredo', () => {
    expect(redactSecrets('mensagem normal sem chave')).toBe(
      'mensagem normal sem chave'
    );
    expect(redactSecrets('email user@example.com tudo ok')).toBe(
      'email user@example.com tudo ok'
    );
  });

  it('não confunde palavras que começam com "sk" mas não são chave', () => {
    // "skinny" não tem hifen + 16+ chars; "ski" é curto
    expect(redactSecrets('skater skinny ski')).toBe('skater skinny ski');
  });
});

describe('redactSecrets — objetos', () => {
  it('mascara valor de chave sensível direta', () => {
    const out = redactSecrets({ api_key: 'sk-XXX', user: 'joe' }) as Record<
      string,
      unknown
    >;
    expect(out.api_key).toBe('[REDACTED]');
    expect(out.user).toBe('joe');
  });

  it('match case-insensitive em chaves', () => {
    const out = redactSecrets({
      ApiKey: 'a',
      AUTHORIZATION: 'b',
      Password: 'c',
      Token: 'd',
    }) as Record<string, unknown>;
    expect(out.ApiKey).toBe('[REDACTED]');
    expect(out.AUTHORIZATION).toBe('[REDACTED]');
    expect(out.Password).toBe('[REDACTED]');
    expect(out.Token).toBe('[REDACTED]');
  });

  it('cobre access_token, refresh_token, client_secret, private_key, cookie', () => {
    const out = redactSecrets({
      access_token: 'a',
      refresh_token: 'b',
      client_secret: 'c',
      private_key: 'd',
      cookie: 'e',
      auth_token: 'f',
    }) as Record<string, unknown>;
    for (const k of Object.keys(out)) {
      expect(out[k]).toBe('[REDACTED]');
    }
  });

  it('redige nested objects recursivamente', () => {
    const input = {
      request: {
        headers: {
          authorization: 'Bearer xyz',
          'content-type': 'application/json',
        },
      },
    };
    const out = redactSecrets(input) as { request: { headers: Record<string, string> } };
    expect(out.request.headers.authorization).toBe('[REDACTED]');
    expect(out.request.headers['content-type']).toBe('application/json');
  });

  it('redige strings dentro de valores de objeto que não são secret-key', () => {
    const out = redactSecrets({
      message: 'failed with Bearer sk-leak1234567890ABCD',
      ok: false,
    }) as Record<string, unknown>;
    expect(out.message).toMatch(/Bearer \[REDACTED\]/);
    expect(out.message).not.toMatch(/sk-leak/);
    expect(out.ok).toBe(false);
  });
});

describe('redactSecrets — arrays', () => {
  it('processa cada elemento', () => {
    const out = redactSecrets([
      'sk-abcdef1234567890ABCD',
      { token: 'x' },
      42,
    ]) as unknown[];
    expect(out[0]).toBe('sk-[REDACTED]');
    expect((out[1] as Record<string, unknown>).token).toBe('[REDACTED]');
    expect(out[2]).toBe(42);
  });

  it('processa array de tuples estilo Headers iterator', () => {
    // Headers iteration yields [['key', 'value'], ...]
    const headers: [string, string][] = [
      ['authorization', 'Bearer x.y.z'],
      ['content-type', 'application/json'],
    ];
    const out = redactSecrets(headers) as [string, string][];
    expect(out[0][0]).toBe('authorization');
    expect(out[0][1]).toMatch(/Bearer \[REDACTED\]/);
    expect(out[1]).toEqual(['content-type', 'application/json']);
  });
});

describe('redactSecrets — Error', () => {
  it('redige Error.message contendo sk-', () => {
    const err = new Error('OpenAI rejected key sk-EVILKEY1234567890ABCD');
    const out = redactSecrets(err) as { message: string };
    expect(out.message).not.toContain('sk-EVILKEY');
    expect(out.message).toContain('sk-[REDACTED]');
  });

  it('redige Error.stack contendo Bearer (browsers anexam headers ao stack)', () => {
    const err = new Error('fetch failed');
    err.stack = 'Error: fetch failed\n  at request Bearer abc.def.ghi\n  at Module._compile';
    const out = redactSecrets(err) as { stack?: string };
    expect(out.stack).toBeDefined();
    expect(out.stack).not.toContain('Bearer abc.def.ghi');
    expect(out.stack).toMatch(/Bearer \[REDACTED\]/);
  });

  it('preserva Error.name e estrutura plain (JSON-serializável)', () => {
    const err = new TypeError('not a function');
    const out = redactSecrets(err) as { name: string; message: string };
    expect(out.name).toBe('TypeError');
    expect(out.message).toBe('not a function');
    // Plain object — sink pode JSON.stringify sem perder dados
    expect(JSON.stringify(out)).toContain('"name":"TypeError"');
  });
});

describe('redactSecrets — primitivos e edge cases', () => {
  it('retorna primitivos sem mudar', () => {
    expect(redactSecrets(null)).toBeNull();
    expect(redactSecrets(undefined)).toBeUndefined();
    expect(redactSecrets(42)).toBe(42);
    expect(redactSecrets(true)).toBe(true);
    expect(redactSecrets(BigInt(99))).toBe(BigInt(99));
  });

  it('converte function e symbol pra string (não crash)', () => {
    const fn = () => 0;
    expect(typeof redactSecrets(fn)).toBe('string');
    expect(typeof redactSecrets(Symbol('x'))).toBe('string');
  });

  it('respeita MAX_DEPTH em grafos profundos', () => {
    // 10 níveis de aninhamento — passa do MAX_DEPTH=6
    let deep: Record<string, unknown> = { secret: 'leaf' };
    for (let i = 0; i < 10; i++) {
      deep = { nested: deep };
    }
    const out = JSON.stringify(redactSecrets(deep));
    expect(out).toContain('[MAX_DEPTH]');
    // a leaf "secret" key, se conseguir chegar lá, seria redacted; mas
    // o ponto é não crashar com depth > MAX_DEPTH
  });
});

describe('logger.warn/error — integração com redactor', () => {
  it('warn redige sk- na message', () => {
    const { sink, captured } = makeSink();
    setLogSink(sink);
    logger.warn('failed with sk-EVILKEY1234567890ABCD active');
    expect(captured).toHaveLength(1);
    expect(captured[0].message).not.toContain('sk-EVILKEY');
    expect(captured[0].message).toContain('sk-[REDACTED]');
  });

  it('error redige Authorization no context', () => {
    const { sink, captured } = makeSink();
    setLogSink(sink);
    logger.error('OpenAI request failed', {
      headers: { authorization: 'Bearer secret.token.xyz' },
      reason: 'failed to fetch',
    });
    const text = JSON.stringify(captured);
    expect(text).not.toContain('secret.token.xyz');
    expect(text).toContain('failed to fetch');
  });

  it('error redige api_key dentro de context object', () => {
    const { sink, captured } = makeSink();
    setLogSink(sink);
    logger.error('config issue', { api_key: 'sk-EVILLLLL12345678', endpoint: '/v1/chat' });
    const text = JSON.stringify(captured);
    expect(text).not.toContain('sk-EVILLLLL');
    expect(text).toContain('/v1/chat');
  });

  it('error redige Error passado dentro de context', () => {
    const { sink, captured } = makeSink();
    setLogSink(sink);
    const err = new Error('fetch failed with Bearer sk-LEAK1234567890ABCD');
    logger.error('OpenAI request failed', { error: err });
    const text = JSON.stringify(captured);
    expect(text).not.toContain('sk-LEAK');
    expect(text).not.toContain('Bearer sk-');
    expect(text).toContain('Bearer [REDACTED]');
  });

  it('mantém context inalterado quando não há segredo', () => {
    const { sink, captured } = makeSink();
    setLogSink(sink);
    logger.warn('cache miss', { key: 'mascot:abc', hits: 0 });
    expect(captured[0].context).toEqual({ key: 'mascot:abc', hits: 0 });
  });
});
