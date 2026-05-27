import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fallbackGenome, generateProceduralGenome, shouldRegenerate } from '@/lib/procedural/generate';
import { validateProceduralGenome } from '@/lib/procedural/schema';

const originalFetch = globalThis.fetch;
function setFetchMock(impl: () => unknown) {
  (globalThis as { fetch: unknown }).fetch = (() => Promise.resolve(impl())) as unknown as typeof fetch;
}
function restoreFetch() {
  (globalThis as { fetch: unknown }).fetch = originalFetch as unknown as typeof fetch;
}

describe('shouldRegenerate', () => {
  it('regenera se sem genome', () => {
    expect(shouldRegenerate(null)).toBe(true);
    expect(shouldRegenerate(undefined)).toBe(true);
  });

  it('regenera se genome > 24h', () => {
    const g = fallbackGenome({ personality: 'calmo', trigger: 'evolution:bebe' });
    g.generatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(shouldRegenerate(g)).toBe(true);
  });

  it('não regenera dentro de 24h', () => {
    const g = fallbackGenome({ personality: 'calmo', trigger: 'evolution:bebe' });
    g.generatedAt = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
    expect(shouldRegenerate(g)).toBe(false);
  });
});

describe('fallbackGenome', () => {
  it('é determinístico por input', () => {
    const a = fallbackGenome({ personality: 'calmo', trigger: 'evolution:bebe', userId: 'u1' });
    const b = fallbackGenome({ personality: 'calmo', trigger: 'evolution:bebe', userId: 'u1' });
    // generatedAt difere — comparamos só o conteúdo procedural
    expect(a.palette).toEqual(b.palette);
    expect(a.silhouette).toEqual(b.silhouette);
    expect(a.marks).toEqual(b.marks);
  });

  it('produz genome que passa pela validação', () => {
    const g = fallbackGenome({
      personality: 'motivador',
      trigger: 'streak:30d',
      userId: 'u2',
      streak: 30,
      phase: 'adulto',
      mascotName: 'Pip',
    });
    expect(() => validateProceduralGenome(JSON.parse(JSON.stringify(g)))).not.toThrow();
  });

  it('cap em 5 marks mesmo com streak alto', () => {
    const g = fallbackGenome({
      personality: 'fofo',
      trigger: 'streak:365d',
      userId: 'u3',
      streak: 365,
    });
    expect(g.marks.length).toBeLessThanOrEqual(5);
  });

  it('story contém o nome do mascote', () => {
    const g = fallbackGenome({
      personality: 'sabio',
      trigger: 'evolution:adolescente',
      userId: 'u4',
      mascotName: 'Luna',
      phase: 'adolescente',
    });
    expect(g.story).toContain('Luna');
  });
});

describe('generateProceduralGenome', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_AI_PROXY_URL;
  });
  afterEach(() => {
    restoreFetch();
  });

  it('devolve fallback quando proxy não configurado', async () => {
    const g = await generateProceduralGenome({
      personality: 'calmo',
      trigger: 'evolution:bebe',
      userId: 'u1',
    });
    expect(g.version).toBe(1);
    expect(g.trigger).toBe('evolution:bebe');
  });

  it('usa fallback quando proxy responde HTTP 500', async () => {
    process.env.EXPO_PUBLIC_AI_PROXY_URL = 'https://proxy.test';
    setFetchMock(() => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));
    const g = await generateProceduralGenome({
      personality: 'calmo',
      trigger: 'evolution:bebe',
    });
    expect(g.version).toBe(1);
  });

  it('valida resposta do proxy', async () => {
    process.env.EXPO_PUBLIC_AI_PROXY_URL = 'https://proxy.test';
    const valid = fallbackGenome({ personality: 'calmo', trigger: 'evolution:bebe' });
    setFetchMock(() => ({
      ok: true,
      json: async () => valid,
    }));
    const g = await generateProceduralGenome({
      personality: 'calmo',
      trigger: 'evolution:bebe',
    });
    expect(g.trigger).toBe('evolution:bebe');
  });

  it('cai para fallback quando proxy retorna JSON inválido', async () => {
    process.env.EXPO_PUBLIC_AI_PROXY_URL = 'https://proxy.test';
    setFetchMock(() => ({
      ok: true,
      json: async () => ({ version: 99, trigger: 'invalid' }),
    }));
    const g = await generateProceduralGenome({
      personality: 'calmo',
      trigger: 'evolution:bebe',
    });
    expect(g.version).toBe(1);
    expect(g.trigger).toBe('evolution:bebe');
  });
});
