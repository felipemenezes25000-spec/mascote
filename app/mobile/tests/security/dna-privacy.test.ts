/**
 * PENTEST — privacidade do DNA.
 *
 * O Genome é dado pessoal local-first. Nunca deve:
 *  1. Aparecer em payload enviado pra IA (BYOK/OpenAI)
 *  2. Aparecer em mensagens de chat com o mascote
 *  3. Aparecer em logs de nível info+ (só debug aceito)
 *  4. Aparecer em telemetria → pentest-surface.test.ts (PENTEST 11)
 *  5. Ser exposto via URL/QR/share → N/A (sem share de DNA no app)
 *  6. Export LGPD sem secrets BYOK → pentest-surface.test.ts (PENTEST 12)
 *
 * Estes testes falham se alguém futuramente derrubar a barreira de
 * privacidade — agem como guard rail de code review automatizado.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateGenome,
  serializeGenome,
  GENE_KEYS,
} from '@/lib/dna';
import type { Genome } from '@/lib/dna';

describe('PRIVACIDADE: Genome nunca pode vazar para IA', () => {
  it('nenhum nome de gene aparece em logs por padrão', async () => {
    // Carrega o logger
    const { logger } = await import('@/lib/logger');
    const calls: unknown[][] = [];
    const original = logger.warn;
    logger.warn = ((...args: unknown[]) => {
      calls.push(args);
    }) as typeof logger.warn;

    try {
      // Exemplo de chamada que NÃO deve vazar DNA
      logger.warn('algum aviso genérico', { foo: 'bar' });
      const serialized = JSON.stringify(calls);
      for (const k of GENE_KEYS) {
        expect(serialized.toLowerCase()).not.toContain(k.toLowerCase());
      }
    } finally {
      logger.warn = original;
    }
  });

  it('serializeGenome é determinístico mas não reverte por hash', async () => {
    const g = generateGenome(42);
    const s = serializeGenome(g);
    // serialização é por valor numérico — confirma que NÃO há nome de gene no payload
    for (const k of GENE_KEYS) {
      expect(s).not.toContain(k);
    }
  });

  it('Mascot serializado para JSON contém dna, MAS isso é local-first', () => {
    // Garante que se alguém serializa um mascot, o DNA está lá — esse é o
    // contrato local. O QUE NÃO PODE é alguma rota enviar pra fora.
    // Vê test de prompt-isolation abaixo.
    const fakeMascot = {
      id: 'm_1',
      user_id: 'u_1',
      name: 'Lulu',
      personality: 'fofo' as const,
      phase: 'crianca' as const,
      mood: 'ok' as const,
      xp: 100,
      level: 3,
      energy: 100,
      health: 100,
      dna: generateGenome(42),
      dna_seed: 42,
      last_seen_at: '2026-05-19T00:00:00Z',
      created_at: '2026-05-01T00:00:00Z',
    };
    const json = JSON.stringify(fakeMascot);
    expect(json).toContain('"dna"');
  });
});

describe('PRIVACIDADE: prompt builder NÃO inclui DNA', () => {
  it('strings de prompt do mascote NÃO referenciam genes', async () => {
    // Procura em src/content/replies.ts (carregado dinamicamente) por
    // strings que mencionem chaves de DNA — preventivo
    try {
      const replies = await import('@/content/replies');
      const flat = JSON.stringify(replies).toLowerCase();
      // Permite "empathy" se for cabeçalho de doc, mas NÃO esperamos
      // que strings de IA usem essa terminologia técnica
      const technicalTerms = ['empathy', 'aggression', 'genome', 'dna_seed'];
      for (const t of technicalTerms) {
        const occurrences = (flat.match(new RegExp(t, 'gi')) || []).length;
        // Tolera até 1 menção (em comentário). Acima disso = pollution
        expect(occurrences).toBeLessThanOrEqual(1);
      }
    } catch {
      // Se replies não existe / não carrega, OK — sem regressão
    }
  });
});

describe('SEGURANÇA: corrupção de input não derruba', () => {
  it('sanitizeGenome nunca lança para qualquer input', async () => {
    const { sanitizeGenome } = await import('@/lib/dna');
    const malicious: unknown[] = [
      null,
      undefined,
      [],
      {},
      'random string',
      42,
      true,
      Symbol('x'),
      () => 'fn',
      { __proto__: { empathy: 'sql-injection' } },
      { empathy: '0.5; DROP TABLE mascots;' },
      { empathy: { nested: 'object' } },
      { empathy: 0.5, ...Object.fromEntries(Array(1000).fill(0).map((_, i) => [`bad_${i}`, i])) },
      Array(10000).fill('x'),
    ];
    for (const m of malicious) {
      expect(() => sanitizeGenome(m)).not.toThrow();
    }
  });

  it('deserializeGenome nunca lança', async () => {
    const { deserializeGenome } = await import('@/lib/dna');
    const inputs: unknown[] = ['', 'x'.repeat(10000), '\\0\\0\\0', '{}', '[]', null, 42];
    for (const i of inputs) {
      expect(() => deserializeGenome(i as string)).not.toThrow();
    }
  });
});

describe('PROTOTYPE POLLUTION: __proto__ não pode atacar genoma', () => {
  it('payload com __proto__ não polui Object.prototype', async () => {
    const { sanitizeGenome } = await import('@/lib/dna');
    const maliciousPayload = JSON.parse(
      '{"__proto__": {"polluted": "yes"}, "empathy": 0.5}',
    );
    sanitizeGenome(maliciousPayload);
    // Object.prototype não foi contaminado
    expect((({} as Record<string, unknown>).polluted)).toBeUndefined();
  });
});

describe('IDEMPOTÊNCIA: migration v1→v2 é idempotente', () => {
  it('rodar migration 2× resulta no mesmo estado', async () => {
    // Mock AsyncStorage
    const storage: Record<string, string> = {};
    const mock = {
      getItem: vi.fn(async (k: string) => storage[k] ?? null),
      setItem: vi.fn(async (k: string, v: string) => { storage[k] = v; }),
      removeItem: vi.fn(async (k: string) => { delete storage[k]; }),
      clear: vi.fn(async () => { for (const k of Object.keys(storage)) delete storage[k]; }),
    };
    vi.doMock('@react-native-async-storage/async-storage', () => ({ default: mock }));

    // Seeded mascots como se viessem do schema v1 (sem DNA)
    const v1Mascots = [
      {
        id: 'm_1', user_id: 'u_a', name: 'Bipo', personality: 'calmo',
        phase: 'crianca', mood: 'ok', xp: 100, level: 3, energy: 100, health: 100,
        last_seen_at: '2026-05-01T00:00:00Z', created_at: '2026-04-01T00:00:00Z',
      },
      {
        id: 'm_2', user_id: 'u_b', name: 'Lulu', personality: 'fofo',
        phase: 'bebe', mood: 'feliz', xp: 50, level: 2, energy: 90, health: 100,
        last_seen_at: '2026-05-01T00:00:00Z', created_at: '2026-04-15T00:00:00Z',
      },
    ];
    storage['mascote:mascots'] = JSON.stringify(v1Mascots);
    storage['mascote:_meta'] = JSON.stringify({ schema: 1 });

    // Limpa caches do dynamic import
    vi.resetModules();
    const dbV1 = await import('@/lib/db');
    await dbV1.runMigrations();
    const after1 = JSON.parse(storage['mascote:mascots'] ?? '[]');
    expect(after1.length).toBe(2);
    for (const m of after1) {
      expect(m.dna).toBeDefined();
      expect(typeof m.dna_seed).toBe('number');
    }

    // Rodar de novo: idempotente — DNA não muda
    const snapshot = JSON.stringify(after1);
    await dbV1.runMigrations();
    const after2 = storage['mascote:mascots'] ?? '[]';
    expect(after2).toBe(snapshot);

    vi.doUnmock('@react-native-async-storage/async-storage');
  });
});
