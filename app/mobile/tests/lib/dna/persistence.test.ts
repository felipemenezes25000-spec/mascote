/**
 * persistence.ts — testes do wrapper de I/O do DNA no AsyncStorage.
 *
 * Foca na invariante: TODA entrada sai sanitizada (GENE_MIN..GENE_MAX),
 * mesmo se input for corrompido. Log warning aparece quando chaves estão
 * faltando, sem nunca expor valores brutos.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  prepareDnaForStorage,
  readDnaFromStorage,
} from '@/lib/dna/persistence';
import { GENE_MAX, GENE_MIN } from '@/lib/dna/genome';
import { logger } from '@/lib/logger';

const FULL_DNA = {
  empathy: 0.5,
  curiosity: 0.5,
  creativity: 0.5,
  discipline: 0.5,
  chaos: 0.5,
  aggression: 0.5,
  resilience: 0.5,
  emotionalDepth: 0.5,
  socialEnergy: 0.5,
  adaptability: 0.5,
  intelligence: 0.5,
};

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('prepareDnaForStorage', () => {
  it('passa DNA válido sem modificação semântica', () => {
    const out = prepareDnaForStorage(FULL_DNA);
    expect(out.empathy).toBeCloseTo(0.5);
    expect(out.intelligence).toBeCloseTo(0.5);
  });

  it('null vira DNA neutro válido (sanitizado)', () => {
    const out = prepareDnaForStorage(null);
    for (const v of Object.values(out)) {
      expect(v).toBeGreaterThanOrEqual(GENE_MIN);
      expect(v).toBeLessThanOrEqual(GENE_MAX);
    }
  });

  it('undefined vira DNA neutro válido', () => {
    const out = prepareDnaForStorage(undefined);
    expect(Object.keys(out)).toHaveLength(11);
  });

  it('valores fora do range [GENE_MIN, GENE_MAX] são clampados', () => {
    const corrupted = { ...FULL_DNA, empathy: 2.0, creativity: -0.5 };
    const out = prepareDnaForStorage(corrupted);
    expect(out.empathy).toBeLessThanOrEqual(GENE_MAX);
    expect(out.creativity).toBeGreaterThanOrEqual(GENE_MIN);
  });

  it('NaN é substituído por valor neutro válido', () => {
    const corrupted = { ...FULL_DNA, empathy: Number.NaN };
    const out = prepareDnaForStorage(corrupted);
    expect(Number.isFinite(out.empathy)).toBe(true);
    expect(out.empathy).toBeGreaterThanOrEqual(GENE_MIN);
  });
});

describe('readDnaFromStorage', () => {
  it('DNA completo (11 chaves) — sanitiza sem warning', () => {
    const out = readDnaFromStorage(FULL_DNA);
    expect(out.empathy).toBeCloseTo(0.5);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('DNA com chaves faltando — sanitiza E loga warning (sem expor valores)', () => {
    const incomplete = { empathy: 0.5, curiosity: 0.6 };
    const out = readDnaFromStorage(incomplete);
    expect(Object.keys(out)).toHaveLength(11);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    // O metadata logado deve conter APENAS recovered_hash, nunca os valores
    const [msg, meta] = warnSpy.mock.calls[0] ?? [];
    expect(msg).toContain('chaves incompletas');
    expect(meta).toHaveProperty('recovered_hash');
    // Nenhum gene cru deve estar nos logs
    const stringified = JSON.stringify(meta);
    expect(stringified).not.toContain('0.5');
    expect(stringified).not.toContain('0.6');
  });

  it('input primitivo (number, string) — sanitiza sem warning, sem crash', () => {
    expect(() => readDnaFromStorage(42)).not.toThrow();
    expect(() => readDnaFromStorage('not-dna')).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('null/undefined — sanitiza sem warning', () => {
    const out1 = readDnaFromStorage(null);
    const out2 = readDnaFromStorage(undefined);
    expect(Object.keys(out1)).toHaveLength(11);
    expect(Object.keys(out2)).toHaveLength(11);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('objeto vazio dispara warning de chaves faltando', () => {
    readDnaFromStorage({});
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('output sempre tem 11 chaves canônicas', () => {
    const inputs: unknown[] = [
      null,
      undefined,
      {},
      { empathy: 0.5 },
      FULL_DNA,
      { junk: 'data' },
      42,
    ];
    for (const input of inputs) {
      const out = readDnaFromStorage(input);
      expect(Object.keys(out)).toHaveLength(11);
    }
  });
});
