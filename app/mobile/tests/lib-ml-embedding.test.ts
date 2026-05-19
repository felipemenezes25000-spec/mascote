/**
 * Tests pra src/lib/ml/embedding/{index,local,openai}.ts.
 * Cobre paths: openai com fetch mock, local com stats, fallback de erro.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dim, embed, detectMode, OPENAI_EMBED_DIM } from '@/lib/ml/embedding';
import { LOCAL_EMBED_DIM, embedLocal } from '@/lib/ml/embedding/local';
import { embedOpenAI } from '@/lib/ml/embedding/openai';
import { emptyStats, addDocument } from '@/lib/ml/text/tfidf';

declare const __asyncStorageReset: () => void;

beforeEach(() => {
  vi.unstubAllGlobals();
  __asyncStorageReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('embedding: detectMode + dim', () => {
  it('sem apiKey → local', () => expect(detectMode({})).toBe('local'));
  it('com apiKey → openai', () => expect(detectMode({ apiKey: 'sk' })).toBe('openai'));
  it('dim local = LOCAL_EMBED_DIM', () => expect(dim('local')).toBe(LOCAL_EMBED_DIM));
  it('dim openai = OPENAI_EMBED_DIM', () => expect(dim('openai')).toBe(OPENAI_EMBED_DIM));
});

describe('embedding: local', () => {
  it('retorna vetor LOCAL_EMBED_DIM L2-normalizado (norma ≈ 1)', () => {
    const stats = emptyStats();
    addDocument(stats, 'hoje bebi água');
    addDocument(stats, 'caminhei no parque');
    const v = embedLocal('hoje bebi água', stats);
    expect(v.length).toBe(LOCAL_EMBED_DIM);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    // L2 normalized ~ 1 (ou 0 se vetor zero pra texto vazio)
    expect(norm).toBeGreaterThan(0.99);
    expect(norm).toBeLessThan(1.01);
  });
  it('texto vazio → vetor zero', () => {
    const v = embedLocal('', emptyStats());
    expect(v.every(x => x === 0)).toBe(true);
  });
});

describe('embedding: openai', () => {
  it('fetch ok → retorna vetor', async () => {
    const fakeVec = new Array(OPENAI_EMBED_DIM).fill(0.001);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ data: [{ embedding: fakeVec }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    const v = await embedOpenAI('teste', 'sk-test');
    expect(v.length).toBe(OPENAI_EMBED_DIM);
  });

  it('fetch erro http → throw', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('error', { status: 500 })));
    await expect(embedOpenAI('teste', 'sk-test')).rejects.toThrow();
  });

  it('fetch sem embedding no JSON → throw', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    await expect(embedOpenAI('teste', 'sk-test')).rejects.toThrow();
  });

  it('usa cache em chamadas repetidas com o mesmo texto', async () => {
    const fakeVec = new Array(OPENAI_EMBED_DIM).fill(0.5);
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ embedding: fakeVec }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const a = await embedOpenAI('mesma frase', 'sk-test');
    const b = await embedOpenAI('mesma frase', 'sk-test');
    expect(a).toEqual(b);
    // 1 chamada de fetch (segunda veio do cache)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('embedding: embed (router)', () => {
  it('mode local exige stats', async () => {
    await expect(embed('oi', { mode: 'local' })).rejects.toThrow(/stats/i);
  });

  it('mode local com stats funciona', async () => {
    const stats = emptyStats();
    addDocument(stats, 'hoje');
    addDocument(stats, 'amanhã');
    const v = await embed('hoje', { mode: 'local', stats });
    expect(v.length).toBe(LOCAL_EMBED_DIM);
  });

  it('mode openai com apiKey ok → usa OpenAI', async () => {
    const fakeVec = new Array(OPENAI_EMBED_DIM).fill(0.001);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ data: [{ embedding: fakeVec }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    const v = await embed('oi', { mode: 'openai', apiKey: 'sk' });
    expect(v.length).toBe(OPENAI_EMBED_DIM);
  });

  it('mode openai com fetch ruim → fallback pra local (precisa stats)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 500 })));
    const stats = emptyStats();
    addDocument(stats, 'oi');
    const v = await embed('oi', { mode: 'openai', apiKey: 'sk', stats });
    expect(v.length).toBe(LOCAL_EMBED_DIM);
  });

  it('mode openai sem apiKey → cai pro local', async () => {
    const stats = emptyStats();
    addDocument(stats, 'oi');
    const v = await embed('oi', { mode: 'openai', stats });
    expect(v.length).toBe(LOCAL_EMBED_DIM);
  });
});
