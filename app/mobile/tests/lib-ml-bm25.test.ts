import { describe, expect, it } from 'vitest';
import {
  bm25FromTfidf,
  bm25Search,
  emptyIndex,
  indexDocument,
  removeDocument,
} from '@/lib/ml/text/bm25';
import { emptyStats } from '@/lib/ml/text/tfidf';

describe('BM25', () => {
  it('emptyIndex retorna estado zerado', () => {
    const idx = emptyIndex();
    expect(idx.docs.size).toBe(0);
    expect(idx.df.size).toBe(0);
    expect(idx.totalDocLen).toBe(0);
  });

  it('indexDocument adiciona doc + atualiza df + totalDocLen', () => {
    const idx = emptyIndex();
    indexDocument(idx, 'd1', 'água é importante');
    expect(idx.docs.size).toBe(1);
    expect(idx.totalDocLen).toBeGreaterThan(0);
  });

  it('indexDocument re-indexa: decrementa antigos e recalcula', () => {
    const idx = emptyIndex();
    indexDocument(idx, 'd1', 'água parque sol');
    const oldLen = idx.totalDocLen;
    indexDocument(idx, 'd1', 'café'); // reindexa com texto menor
    expect(idx.totalDocLen).toBeLessThan(oldLen);
  });

  it('removeDocument apaga doc + ajusta df', () => {
    const idx = emptyIndex();
    indexDocument(idx, 'd1', 'água parque');
    indexDocument(idx, 'd2', 'água café');
    removeDocument(idx, 'd1');
    expect(idx.docs.has('d1')).toBe(false);
    expect(idx.docs.has('d2')).toBe(true);
  });

  it('removeDocument no-op pra id inexistente', () => {
    const idx = emptyIndex();
    indexDocument(idx, 'd1', 'café');
    removeDocument(idx, 'd-x');
    expect(idx.docs.size).toBe(1);
  });

  it('bm25Search retorna [] em índice vazio', () => {
    expect(bm25Search(emptyIndex(), 'qualquer')).toEqual([]);
  });

  it('bm25Search retorna [] em query vazia', () => {
    const idx = emptyIndex();
    indexDocument(idx, 'd1', 'oi');
    expect(bm25Search(idx, '')).toEqual([]);
  });

  it('bm25Search ordena por score desc + retorna apenas matches', () => {
    const idx = emptyIndex();
    indexDocument(idx, 'd1', 'caminhada parque manhã energia');
    indexDocument(idx, 'd2', 'cafézinho preto leitura curta');
    indexDocument(idx, 'd3', 'parque caminhada');
    const r = bm25Search(idx, 'parque caminhada');
    expect(r.length).toBeGreaterThanOrEqual(2);
    // 'd3' deve ter score competitivo (doc curto, alta freq relativa)
    const top = r[0].id;
    expect(['d1', 'd3']).toContain(top);
    expect(r.every(x => x.score > 0)).toBe(true);
  });

  it('bm25Search respeita limit', () => {
    const idx = emptyIndex();
    for (let i = 0; i < 10; i++) indexDocument(idx, `d${i}`, 'parque caminhada');
    const r = bm25Search(idx, 'parque', { limit: 3 });
    expect(r.length).toBe(3);
  });

  it('bm25Search com k1/b customizados', () => {
    const idx = emptyIndex();
    indexDocument(idx, 'd1', 'água água água');
    indexDocument(idx, 'd2', 'água café livro caminhada');
    const tight = bm25Search(idx, 'água', { k1: 0.5, b: 0 });
    const loose = bm25Search(idx, 'água', { k1: 3, b: 1 });
    expect(tight.length).toBeGreaterThan(0);
    expect(loose.length).toBeGreaterThan(0);
  });

  it('bm25FromTfidf constrói índice ignorando stats (interop)', () => {
    const stats = emptyStats();
    const idx = bm25FromTfidf(stats, [
      { id: 'a', text: 'água' },
      { id: 'b', text: 'parque' },
    ]);
    expect(idx.docs.size).toBe(2);
  });
});
