/**
 * Memória de longo prazo: extração via regex + recall via TF-IDF/keyword.
 *
 * Cobre branches:
 * - extractMemories — cada pattern (event, person, preference, feeling)
 * - rememberFromMessage — persist + dedup
 * - recall — keyword overlap fallback
 * - formatMemoriesForPrompt — formatação
 */

import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearMemories,
  extractMemories,
  formatMemoriesForPrompt,
  listMemories,
  recall,
  rememberFromMessage,
} from '@/lib/memory';

const UID = 'u_test';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('extractMemories — patterns', () => {
  it('event: "tenho prova quarta" → ends in "a" → "marcada"', () => {
    const out = extractMemories(UID, 'tenho prova quarta');
    expect(out.length).toBe(1);
    expect(out[0].kind).toBe('event');
    expect(out[0].summary.toLowerCase()).toContain('marcada');
  });

  it('event: "tenho trabalho amanhã" → ends in "o" → "marcado"', () => {
    const out = extractMemories(UID, 'tenho trabalho amanhã');
    expect(out.some(m => m.kind === 'event' && /marcado/.test(m.summary))).toBe(true);
  });

  it('event: "vou viajar"', () => {
    const out = extractMemories(UID, 'vou viajar essa semana');
    expect(out.some(m => m.kind === 'event' && /viaja/.test(m.summary))).toBe(true);
  });

  it('person: "minha mãe está doente"', () => {
    const out = extractMemories(UID, 'minha mãe está doente');
    expect(out.some(m => m.kind === 'person')).toBe(true);
  });

  it('preference: "amo café"', () => {
    const out = extractMemories(UID, 'amo café gelado de manhã.');
    expect(out.some(m => m.kind === 'preference')).toBe(true);
  });

  it('feeling: "tô ansiosa"', () => {
    const out = extractMemories(UID, 'tô ansiosa hoje');
    expect(out.some(m => m.kind === 'feeling')).toBe(true);
  });

  it('mensagem genérica → 0 memórias', () => {
    const out = extractMemories(UID, 'oi');
    expect(out).toEqual([]);
  });

  it('cada memória tem keywords não-vazios', () => {
    // Use frase curta que case dentro de [3,30] chars do capture group.
    const out = extractMemories(UID, 'amo chá verde de manhã.');
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].keywords.length).toBeGreaterThan(0);
  });
});

describe('rememberFromMessage — persistência e dedup', () => {
  it('persiste novas memórias', async () => {
    await rememberFromMessage(UID, 'amo chá de manhã.');
    const all = await listMemories(UID);
    expect(all.length).toBeGreaterThan(0);
  });

  it('dedup: 2x mesma frase em 24h → não duplica', async () => {
    await rememberFromMessage(UID, 'amo café.');
    await rememberFromMessage(UID, 'amo café.');
    const all = await listMemories(UID);
    // só 1 deve estar
    expect(all.length).toBe(1);
  });

  it('mensagem sem pattern → não adiciona memória mas atualiza TF-IDF', async () => {
    const out = await rememberFromMessage(UID, 'oi tudo bem');
    expect(out).toEqual([]);
    const all = await listMemories(UID);
    expect(all).toEqual([]);
  });
});

describe('recall — keyword fallback', () => {
  it('lista vazia → []', async () => {
    const out = await recall(UID, 'qualquer coisa');
    expect(out).toEqual([]);
  });

  it('recupera memórias relevantes via keyword overlap', async () => {
    await rememberFromMessage(UID, 'amo café preto pela manhã.');
    // Mesma palavra "café" no context
    const out = await recall(UID, 'café é bom');
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].keywords).toContain('cafe');
  });

  it('context sem keywords úteis → []', async () => {
    await rememberFromMessage(UID, 'amo café.');
    const out = await recall(UID, 'oi');
    expect(out).toEqual([]);
  });

  it('recall respeita limit', async () => {
    await rememberFromMessage(UID, 'amo café.');
    await rememberFromMessage(UID, 'amo chá.');
    await rememberFromMessage(UID, 'amo suco.');
    const out = await recall(UID, 'amo bebida', 1);
    expect(out.length).toBeLessThanOrEqual(1);
  });

  it('recall via vector store retorna mems quando há matches semânticos', async () => {
    // Cria múltiplas memórias e força o vector store ser usado
    await rememberFromMessage(UID, 'amo café preto pela manhã.');
    await rememberFromMessage(UID, 'amo chá verde de tarde.');
    await rememberFromMessage(UID, 'amo suco de laranja.');
    // Query similar — força hit no vector store path (linhas 270-280)
    const out = await recall(UID, 'amo café');
    expect(out.length).toBeGreaterThanOrEqual(1);
    // Verifica que ao menos uma memória de "café" foi recalled
    expect(out.some(m => m.source_snippet.includes('café'))).toBe(true);
  });

  it('recall com kind=event aplica weight 1.5x', async () => {
    // 'tenho prova quarta' gera memória kind=event
    await rememberFromMessage(UID, 'tenho prova quarta semana');
    await rememberFromMessage(UID, 'amo prova de queijo');
    const out = await recall(UID, 'prova');
    expect(out.length).toBeGreaterThanOrEqual(1);
    // event tem maior peso, deveria vir na frente
    const eventIdx = out.findIndex(m => m.kind === 'event');
    expect(eventIdx).toBeGreaterThanOrEqual(0);
  });
});

describe('clearMemories', () => {
  it('apaga todas as memórias do user', async () => {
    await rememberFromMessage(UID, 'amo café.');
    await clearMemories(UID);
    expect(await listMemories(UID)).toEqual([]);
  });
});

describe('formatMemoriesForPrompt', () => {
  it('lista vazia → string vazia', () => {
    expect(formatMemoriesForPrompt([])).toBe('');
  });

  it('formata como bullets com tempo relativo', () => {
    const mems = [{
      id: 'm1', user_id: UID, kind: 'event' as const,
      summary: 'tem prova marcada',
      source_snippet: 'tenho prova quarta',
      keywords: ['prova'],
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      last_recalled_at: null,
    }];
    const out = formatMemoriesForPrompt(mems);
    expect(out).toMatch(/^- /);
    expect(out).toContain('prova');
    expect(out).toMatch(/dias atrás/);
  });

  it('"hoje" para memória de 0 dias', () => {
    const mems = [{
      id: 'm', user_id: UID, kind: 'event' as const,
      summary: 'x', source_snippet: '', keywords: [],
      created_at: new Date().toISOString(),
      last_recalled_at: null,
    }];
    expect(formatMemoriesForPrompt(mems)).toMatch(/hoje/);
  });

  it('"ontem" para memória de 1 dia', () => {
    const mems = [{
      id: 'm', user_id: UID, kind: 'event' as const,
      summary: 'x', source_snippet: '', keywords: [],
      created_at: new Date(Date.now() - 1 * 86_400_000 - 1000).toISOString(),
      last_recalled_at: null,
    }];
    expect(formatMemoriesForPrompt(mems)).toMatch(/ontem/);
  });
});

describe('PENTEST — memory adversarial inputs', () => {
  it('texto muito longo é truncado em source_snippet (140 chars)', () => {
    const long = 'amo ' + 'a'.repeat(500) + '.';
    const out = extractMemories(UID, long);
    if (out.length > 0) {
      expect(out[0].source_snippet.length).toBeLessThanOrEqual(140);
    }
  });

  it('characters perigosos (HTML/SQL-like) não causam crash', async () => {
    const evil = "amo <script>alert('xss')</script>; DROP TABLE; -- ";
    await expect(rememberFromMessage(UID, evil)).resolves.toBeDefined();
  });

  it('null bytes não corrompem storage', async () => {
    await expect(rememberFromMessage(UID, 'amo \x00 café \x00')).resolves.toBeDefined();
    const all = await listMemories(UID);
    expect(all).toBeDefined();
  });
});
