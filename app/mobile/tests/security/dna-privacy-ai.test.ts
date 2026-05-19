/**
 * PENTEST — não-vazamento de DNA na fronteira da IA externa (OpenAI).
 *
 * Modelo de ameaça: o brief diz "DNA nunca sai do device". Se um dia o
 * sistema enviar gene bruto pra OpenAI, é (a) leak de PII comportamental,
 * (b) quebra de promessa de privacy, (c) regressão direta do design DLI.
 *
 * Estratégia de teste: interceptamos fetch global e inspecionamos TUDO que
 * sai. Valida que payload nunca contém:
 *  - Nome de gene em inglês (empathy, curiosity, ...)
 *  - Nome de gene em vocabulário científico PT-BR (empatia, criatividade, ...)
 *  - Valores numéricos dos genes (0.82, etc.) — checagem por proximidade
 *    com nomes de gene (não bloqueamos números em geral pq usuário pode
 *    escrever números)
 *  - Chaves de objeto suspeitas ("dna", "genome", "genes")
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateReply } from '@/lib/ai';
import type { MascotDNA } from '@/types';
import {
  GENE_NAMES_FOR_LEAK_DETECTION,
  GENE_PT_NAMES_FOR_LEAK_DETECTION,
} from '@/lib/dna/descriptors';

const DNA_EXTREMO: MascotDNA = {
  empathy: 0.95,
  curiosity: 0.92,
  creativity: 0.88,
  discipline: 0.85,
  chaos: 0.78,
  aggression: 0.65,
  resilience: 0.90,
  emotionalDepth: 0.84,
  socialEnergy: 0.93,
  adaptability: 0.80,
  intelligence: 0.95,
};

function setupFetchInterceptor() {
  const calls: { url: string; body: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const body = typeof init.body === 'string' ? init.body : '';
      calls.push({ url, body });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }),
  );
  return calls;
}

describe('DNA privacy at OpenAI boundary', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('payload da OpenAI NUNCA contém nomes de gene em inglês', async () => {
    const calls = setupFetchInterceptor();
    await generateReply('calmo', 'oi', {
      apiKey: 'sk-test-fake',
      dna: DNA_EXTREMO,
    });
    expect(calls.length).toBeGreaterThan(0);
    const payload = calls.map(c => c.body).join('|');
    const lower = payload.toLowerCase();
    for (const name of GENE_NAMES_FOR_LEAK_DETECTION) {
      expect(lower).not.toContain(name.toLowerCase());
    }
  });

  it('payload da OpenAI NUNCA contém vocabulário científico PT-BR', async () => {
    const calls = setupFetchInterceptor();
    await generateReply('calmo', 'oi', {
      apiKey: 'sk-test-fake',
      dna: DNA_EXTREMO,
    });
    const payload = calls.map(c => c.body).join('|').toLowerCase();
    for (const name of GENE_PT_NAMES_FOR_LEAK_DETECTION) {
      expect(payload).not.toContain(name.toLowerCase());
    }
  });

  it('payload da OpenAI NUNCA contém keys "dna", "genome", "genes"', async () => {
    const calls = setupFetchInterceptor();
    await generateReply('motivador', 'oi', {
      apiKey: 'sk-test-fake',
      dna: DNA_EXTREMO,
    });
    const payload = calls.map(c => c.body).join('|').toLowerCase();
    expect(payload).not.toContain('"dna"');
    expect(payload).not.toContain('"genome"');
    expect(payload).not.toContain('"genes"');
    expect(payload).not.toContain('genoma');
  });

  it('payload NUNCA contém valores numéricos brutos dos genes (0.95, 0.92...)', async () => {
    const calls = setupFetchInterceptor();
    await generateReply('sabio', 'oi', {
      apiKey: 'sk-test-fake',
      dna: DNA_EXTREMO,
    });
    const payload = calls.map(c => c.body).join('|');
    // Cada valor de DNA não deve aparecer como número decimal no payload.
    // Testa cada gene individualmente (tolerância: 0.95 não bate em "0.953").
    for (const value of Object.values(DNA_EXTREMO)) {
      // Formato típico que JSON.stringify produziria: 0.95, 0.95,
      const v2 = value.toFixed(2);
      const v3 = value.toFixed(3);
      const v4 = value.toFixed(4);
      expect(payload).not.toContain(v2);
      expect(payload).not.toContain(v3);
      expect(payload).not.toContain(v4);
    }
  });

  it('payload CONTÉM descritor semântico esperado (sanity check positivo)', async () => {
    const calls = setupFetchInterceptor();
    await generateReply('calmo', 'oi', {
      apiKey: 'sk-test-fake',
      dna: DNA_EXTREMO,
    });
    const payload = calls.map(c => c.body).join('|');
    // socialEnergy 0.93 deveria virar "expansiva" no descritor
    expect(payload).toContain('expansiva');
  });

  it('sem DNA passado → seção de DNA ausente do payload', async () => {
    const calls = setupFetchInterceptor();
    await generateReply('calmo', 'oi', {
      apiKey: 'sk-test-fake',
      // sem dna
    });
    const payload = calls.map(c => c.body).join('|');
    // não deve mencionar "ESTADO ATUAL DA CRIATURA"
    expect(payload).not.toContain('ESTADO ATUAL DA CRIATURA');
    // ainda deve ter system prompt (sanity)
    expect(payload).toContain('PERSONALIDADE');
  });

  it('mock reply path (sem apiKey) não dispara fetch — DNA fica zero risco', async () => {
    const calls = setupFetchInterceptor();
    const r = await generateReply('calmo', 'oi', {
      dna: DNA_EXTREMO,
      // SEM apiKey → mock
    });
    expect(r.source).toBe('mock');
    expect(calls.length).toBe(0);
  });
});
